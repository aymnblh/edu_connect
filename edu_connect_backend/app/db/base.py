from app.db.database import Base
from app.modules.auth.models import VerificationStatus, VerificationRequest, PendingLink, RefreshToken
from app.modules.users.models import UserRole, User, Student, StudentParent, ClassTeacher
from app.modules.schools.models import School, SubscriptionPayment, Semester
from app.modules.academics.models import Course, ClassCourse, Class, ClassMember, ClassTemporaryAccess, Grade, LessonEntry, Homework
from app.modules.attendance.models import AttendanceStatus, RemarkType, Attendance, Remark
from app.modules.messaging.models import ConversationType, Message, Conversation, ConversationParticipant, DirectMessage
from app.modules.notifications.models import Notification, NotificationPreference
from app.modules.core.models import MigrationOrphan, AuditEvent, MediaAttachment
from app.modules.schedule.models import ScheduleSlot, SessionCancellation, ScheduleExam
from app.modules.finance.models import TuitionInvoiceStatus, TuitionInvoice, TuitionPayment

# This file ensures that Alembic can discover all models when it imports Base from here.
