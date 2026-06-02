"""
WebSocket connection manager for real-time messaging using Redis Pub/Sub for scalability.

Supports two room namespaces:
  - Class chat rooms  : keyed as "class:<class_id>"
  - DM conversations  : keyed as "conv:<conversation_id>"

Usage:
    await manager.connect(ws, "class:abc123")
    await manager.connect(ws, "conv:xyz789")
    await manager.broadcast("conv:xyz789", {...})

Scaling design:
  - Each FastAPI instance maintains its own in-memory dict of local WebSocket connections.
  - On broadcast(), the message is PUBLISHED to a single Redis channel.
  - Every instance (including the sender) SUBSCRIBES to that channel and forwards
    the message to its locally connected clients in the matching room.
  - Two separate Redis connections are used: one for pub, one for sub+listen
    (required by the Redis protocol — a SUBSCRIBE connection must not be reused for publish).
  - The listener task auto-reconnects with exponential backoff if Redis goes down.
  - A periodic heartbeat purges stale/dead WebSocket connections every 30 seconds.
"""

import asyncio
import json
import logging
from collections import defaultdict
from fastapi import WebSocket
import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Reconnection parameters for the Redis subscriber
_RECONNECT_BASE_DELAY = 1.0    # seconds
_RECONNECT_MAX_DELAY  = 60.0   # seconds
_HEARTBEAT_INTERVAL   = 30.0   # seconds


class ConnectionManager:
    def __init__(self):
        # Local connections: room_key -> list[WebSocket]
        self.rooms: dict[str, list[WebSocket]] = defaultdict(list)

        # Two separate Redis clients (pub / sub)
        self._pub: redis.Redis | None = None
        self._sub: redis.Redis | None = None
        self._pubsub: redis.client.PubSub | None = None

        self._listener_task: asyncio.Task | None = None
        self._heartbeat_task: asyncio.Task | None = None

        self.channel_name = "educonnect_ws_events"

        # Whether Redis is currently healthy
        self._redis_ok = False

    # ── Lifecycle ────────────────────────────────────────────────────────────

    async def startup(self):
        """Initialize Redis pools and start background tasks."""
        try:
            self._pub = redis.from_url(settings.redis_url, decode_responses=True)
            self._sub = redis.from_url(settings.redis_url, decode_responses=True)
            # Verify connectivity eagerly
            await self._pub.ping()
            self._redis_ok = True
            logger.info("WebSocket Manager: Redis connected.")
        except Exception as e:
            logger.warning(
                f"WebSocket Manager: Redis unavailable at startup ({e}). "
                "Falling back to local-memory delivery (single-instance only)."
            )
            self._redis_ok = False

        # Always start the listener (it handles reconnection internally)
        self._listener_task = asyncio.create_task(
            self._listener_loop(), name="ws_redis_listener"
        )
        self._heartbeat_task = asyncio.create_task(
            self._heartbeat_loop(), name="ws_heartbeat"
        )

    async def shutdown(self):
        """Cancel background tasks and close Redis connections gracefully."""
        for task in (self._listener_task, self._heartbeat_task):
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        if self._pubsub:
            try:
                await self._pubsub.unsubscribe(self.channel_name)
                await self._pubsub.aclose()
            except Exception:
                pass

        for client in (self._pub, self._sub):
            if client:
                try:
                    await client.aclose()
                except Exception:
                    pass

        logger.info("WebSocket Manager shut down.")

    # ── Redis listener with auto-reconnect ───────────────────────────────────

    async def _listener_loop(self):
        """
        Resilient loop: subscribes to the Redis channel and dispatches messages.
        On any error, waits with exponential backoff and reconnects.
        """
        delay = _RECONNECT_BASE_DELAY
        while True:
            try:
                self._pubsub = self._sub.pubsub()
                await self._pubsub.subscribe(self.channel_name)
                self._redis_ok = True
                delay = _RECONNECT_BASE_DELAY  # reset on successful connect
                logger.info("WebSocket Manager: subscribed to Redis channel.")

                async for message in self._pubsub.listen():
                    if message["type"] == "message":
                        await self._dispatch(message["data"])

            except asyncio.CancelledError:
                return  # clean shutdown requested

            except Exception as e:
                self._redis_ok = False
                logger.error(
                    f"WebSocket Manager: Redis listener error ({e}). "
                    f"Reconnecting in {delay:.0f}s…"
                )
                try:
                    if self._pubsub:
                        await self._pubsub.aclose()
                except Exception:
                    pass
                self._pubsub = None

                await asyncio.sleep(delay)
                delay = min(delay * 2, _RECONNECT_MAX_DELAY)

    async def _dispatch(self, raw: str):
        """Parse a Redis message and deliver it to local WebSocket clients."""
        try:
            payload = json.loads(raw)
            room_key = payload.get("room")
            data = payload.get("data")
            if room_key and data is not None:
                await self._send_to_local_room(room_key, data)
        except Exception as e:
            logger.error(f"WebSocket Manager: failed to dispatch message — {e}")

    # ── Heartbeat: purge stale connections ───────────────────────────────────

    async def _heartbeat_loop(self):
        """Every N seconds, send a ping to every connected WebSocket to detect dead ones."""
        while True:
            try:
                await asyncio.sleep(_HEARTBEAT_INTERVAL)
                await self._ping_all()
            except asyncio.CancelledError:
                return
            except Exception as e:
                logger.warning(f"WebSocket Manager: heartbeat error — {e}")

    async def _ping_all(self):
        """Send a JSON ping to all connected clients; remove those that fail."""
        ping_frame = {"type": "ping"}
        rooms_snapshot = dict(self.rooms)
        for room_key, sockets in rooms_snapshot.items():
            dead = []
            for ws in list(sockets):
                try:
                    await ws.send_json(ping_frame)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(ws, room_key)

    # ── Local delivery ───────────────────────────────────────────────────────

    async def _send_to_local_room(self, room_key: str, message: dict):
        """Deliver a message to all WebSockets in this process connected to room_key."""
        dead = []
        for ws in list(self.rooms.get(room_key, [])):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, room_key)

    # ── Public API (unchanged interface) ─────────────────────────────────────

    async def connect(self, websocket: WebSocket, room_key: str):
        await websocket.accept()
        self.rooms[room_key].append(websocket)

    def disconnect(self, websocket: WebSocket, room_key: str):
        room = self.rooms.get(room_key, [])
        if websocket in room:
            room.remove(websocket)
        if not room:
            self.rooms.pop(room_key, None)

    async def broadcast(self, room_key: str, message: dict):
        """
        Publish a message so every backend instance delivers it to its local clients.

        Flow:
          1. Serialize {room, data} and PUBLISH to Redis.
          2. Every instance (including this one) receives it via the subscriber
             and calls _send_to_local_room.

        If Redis is unavailable, falls back to local-only delivery (single-instance).
        """
        if self._redis_ok and self._pub:
            try:
                payload = json.dumps({"room": room_key, "data": message})
                await self._pub.publish(self.channel_name, payload)
                return
            except Exception as e:
                logger.warning(f"WebSocket Manager: publish failed ({e}), falling back to local.")
                self._redis_ok = False

        # Fallback: deliver only to clients on this instance
        await self._send_to_local_room(room_key, message)

    # ── Convenience room key helpers ─────────────────────────────────────────

    @staticmethod
    def class_room(class_id: str) -> str:
        return f"class:{class_id}"

    @staticmethod
    def class_user_room(class_id: str, user_id: str) -> str:
        return f"class:{class_id}:user:{user_id}"

    @staticmethod
    def conv_room(conversation_id: str) -> str:
        return f"conv:{conversation_id}"


manager = ConnectionManager()
