"""
Direct Messaging (DM) Router
============================
Aggregates contacts, moderation, and conversation sub-routers under `/dm`.
"""
from fastapi import APIRouter

from app.core.rate_limit import check_rate_limit
from . import dm_contacts, dm_conversations, dm_moderation
from .dm_contacts import _load_contact_classes, list_dm_contacts
from .dm_conversations import (
    broadcast_to_class_parents,
    create_bulk_direct_conversations,
    create_direct_conversation,
    dm_websocket,
    get_conversation_messages,
    list_my_conversations,
    mark_conversation_read,
    send_message,
)
from .dm_moderation import (
    block_message_user,
    list_message_blocks,
    list_message_reports,
    report_conversation_message,
    unblock_message_user,
    update_message_report,
)
from .dm_shared import (
    BroadcastRequest,
    ContactClassOut,
    ContactOut,
    ConversationOut,
    CreateBulkConversationsRequest,
    CreateConversationRequest,
    CreateMessageReportRequest,
    DirectMessageOut,
    MessageBlockOut,
    MessageReportOut,
    ParticipantOut,
    SendMessageRequest,
    UpdateMessageReportRequest,
    _ADMIN_ROLES,
    _REPORT_REASONS,
    _REPORT_STATUSES,
    _STAFF_ROLES,
    _assert_can_dm,
    _assert_can_send_in_conversation,
    _assert_can_send_message,
    _assert_not_message_blocked,
    _assert_participant,
    _build_conv_out,
    _filter_blocked_contacts,
    _get_or_create_direct_conv,
    _notify_dm_recipients,
)

router = APIRouter(prefix="/dm", tags=["Direct Messaging"])
router.include_router(dm_contacts.router)
router.include_router(dm_moderation.router)
router.include_router(dm_conversations.router)

__all__ = [
    "router",
    "check_rate_limit",
    "BroadcastRequest",
    "ContactClassOut",
    "ContactOut",
    "ConversationOut",
    "CreateBulkConversationsRequest",
    "CreateConversationRequest",
    "CreateMessageReportRequest",
    "DirectMessageOut",
    "MessageBlockOut",
    "MessageReportOut",
    "ParticipantOut",
    "SendMessageRequest",
    "UpdateMessageReportRequest",
    "_ADMIN_ROLES",
    "_REPORT_REASONS",
    "_REPORT_STATUSES",
    "_STAFF_ROLES",
    "_assert_can_dm",
    "_assert_can_send_in_conversation",
    "_assert_can_send_message",
    "_assert_not_message_blocked",
    "_assert_participant",
    "_build_conv_out",
    "_filter_blocked_contacts",
    "_get_or_create_direct_conv",
    "_load_contact_classes",
    "_notify_dm_recipients",
    "block_message_user",
    "broadcast_to_class_parents",
    "create_bulk_direct_conversations",
    "create_direct_conversation",
    "dm_websocket",
    "get_conversation_messages",
    "list_dm_contacts",
    "list_message_blocks",
    "list_message_reports",
    "list_my_conversations",
    "mark_conversation_read",
    "report_conversation_message",
    "send_message",
    "unblock_message_user",
    "update_message_report",
]
