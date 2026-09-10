import asyncio

import pytest
from fastapi import HTTPException
from sqlalchemy.dialects import postgresql

from app.models import Class, Conversation, ConversationParticipant, User, UserRole
from app.modules.messaging.routers import chat, dm


def run(coro):
    return asyncio.run(coro)


class FakeResult:
    def __init__(self, rows=None):
        self.rows = rows or []

    def scalar_one(self):
        if not self.rows:
            raise AssertionError("Expected one row")
        return self.rows[0]

    def scalar_one_or_none(self):
        return self.rows[0] if self.rows else None

    def scalars(self):
        return self

    def all(self):
        return self.rows


class FakeDb:
    def __init__(self, results=None):
        self.results = list(results or [])
        self.executed = []
        self.added = []
        self.commits = 0
        self.flushes = 0

    async def execute(self, statement, *_args, **_kwargs):
        self.executed.append(statement)
        if not self.results:
            raise AssertionError("Unexpected database query")
        return self.results.pop(0)

    def add(self, instance):
        self.added.append(instance)

    async def flush(self):
        self.flushes += 1

    async def commit(self):
        self.commits += 1

    async def refresh(self, _instance):
        return None


def make_user(user_id: str, role: UserRole, school_id: str = "school-a") -> User:
    return User(
        id=user_id,
        school_id=school_id,
        email=f"{user_id}@example.test",
        full_name=user_id.replace("-", " ").title(),
        role=role,
    )


def compiled_sql(statement) -> str:
    return str(
        statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )


def test_class_broadcast_participants_are_only_teacher_and_parents_of_that_class(monkeypatch):
    teacher = make_user("teacher-a", UserRole.teacher)
    class_parent = make_user("parent-class-a", UserRole.parent)
    other_class_parent = make_user("parent-class-b", UserRole.parent)
    reloaded_conversation = Conversation(
        id="conversation-a",
        school_id="school-a",
        title="Classe A",
        created_by=teacher.id,
    )
    db = FakeDb(
        results=[
            FakeResult(["class-a"]),
            FakeResult([class_parent]),
            FakeResult([reloaded_conversation]),
        ]
    )

    async def no_rate_limit(*_args, **_kwargs):
        return None

    monkeypatch.setattr(dm, "check_rate_limit", no_rate_limit)
    monkeypatch.setattr(dm, "_build_conv_out", lambda conversation, _user_id: conversation)

    result = run(
        dm.broadcast_to_class_parents(
            dm.BroadcastRequest(
                class_id="class-a",
                title="Information classe A",
                initial_message="Reunion vendredi.",
            ),
            current_user=teacher,
            db=db,
        )
    )

    participant_ids = {
        item.user_id
        for item in db.added
        if isinstance(item, ConversationParticipant)
    }
    assert result is reloaded_conversation
    assert participant_ids == {teacher.id, class_parent.id}
    assert other_class_parent.id not in participant_ids
    parent_query = compiled_sql(db.executed[1])
    assert "class_members.class_id = 'class-a'" in parent_query
    assert "student_parents.school_id = 'school-a'" in parent_query


def test_teacher_can_dm_a_parent_of_a_taught_student_but_not_another_class_parent():
    teacher = make_user("teacher-a", UserRole.teacher)
    allowed_parent = make_user("parent-class-a", UserRole.parent)

    allowed_db = FakeDb(
        results=[
            FakeResult([allowed_parent]),
            FakeResult([allowed_parent.id]),
            FakeResult(),
        ]
    )
    assert run(dm._assert_can_dm(teacher, allowed_parent.id, allowed_db)) is allowed_parent

    denied_parent = make_user("parent-class-b", UserRole.parent)
    denied_db = FakeDb(
        results=[
            FakeResult([denied_parent]),
            FakeResult(),
            FakeResult(),
        ]
    )
    with pytest.raises(HTTPException) as exc:
        run(dm._assert_can_dm(teacher, denied_parent.id, denied_db))

    assert exc.value.status_code == 403


def test_class_chat_private_message_is_visible_only_to_selected_parent(monkeypatch):
    async def class_audience(*_args, **_kwargs):
        return {"teacher-a", "principal-a", "parent-class-a", "parent-class-b"}

    monkeypatch.setattr(chat, "_class_audience_ids", class_audience)
    teacher = make_user("teacher-a", UserRole.teacher)

    recipients = run(
        chat._resolve_class_message_recipients(
            class_id="class-a",
            school_id="school-a",
            sender=teacher,
            is_announcement=False,
            requested_ids=["parent-class-a"],
            db=FakeDb(),
        )
    )

    assert recipients == ["parent-class-a", "teacher-a"]
    message = chat.Message(
        id="message-a",
        school_id="school-a",
        class_id="class-a",
        sender_id=teacher.id,
        sender_name=teacher.full_name,
        content="Message prive",
        recipient_ids=recipients,
    )
    assert chat._can_view_message(message, make_user("parent-class-a", UserRole.parent))
    assert not chat._can_view_message(message, make_user("parent-class-b", UserRole.parent))


def test_class_chat_rejects_selected_parent_outside_the_class(monkeypatch):
    async def class_audience(*_args, **_kwargs):
        return {"teacher-a", "principal-a", "parent-class-a"}

    monkeypatch.setattr(chat, "_class_audience_ids", class_audience)

    with pytest.raises(HTTPException) as exc:
        run(
            chat._resolve_class_message_recipients(
                class_id="class-a",
                school_id="school-a",
                sender=make_user("teacher-a", UserRole.teacher),
                is_announcement=False,
                requested_ids=["parent-class-b"],
                db=FakeDb(),
            )
        )

    assert exc.value.status_code == 403
