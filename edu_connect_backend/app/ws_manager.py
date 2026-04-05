"""
WebSocket connection manager for real-time class chat.
Each class has its own "room" identified by class_id.
"""
from fastapi import WebSocket
from collections import defaultdict


class ConnectionManager:
    def __init__(self):
        # class_id -> list of active WebSocket connections
        self.rooms: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, class_id: str):
        await websocket.accept()
        self.rooms[class_id].append(websocket)

    def disconnect(self, websocket: WebSocket, class_id: str):
        self.rooms[class_id].remove(websocket)
        if not self.rooms[class_id]:
            del self.rooms[class_id]

    async def broadcast(self, class_id: str, message: dict):
        """Send a JSON payload to all connected clients in a room."""
        dead = []
        for ws in self.rooms.get(class_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.rooms[class_id].remove(ws)


manager = ConnectionManager()
