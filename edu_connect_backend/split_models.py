import re

with open("app/models.py", "r", encoding="utf-8") as f:
    content = f.read()

# Define common imports
imports = '''import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, ForeignKey, Text, DateTime, Enum as SAEnum, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)
'''

# Dictionary mapping classes to their respective modules
module_mapping = {
    'auth': ['VerificationStatus', 'VerificationRequest', 'PendingLink', 'RefreshToken'],
    'users': ['UserRole', 'User', 'Student', 'StudentParent', 'ClassTeacher'],
    'schools': ['School', 'SubscriptionPayment', 'Semester'],
    'academics': ['Course', 'ClassCourse', 'Class', 'ClassMember', 'Grade', 'Homework'],
    'attendance': ['AttendanceStatus', 'RemarkType', 'Attendance', 'Remark'],
    'messaging': ['ConversationType', 'Message', 'Conversation', 'ConversationParticipant', 'DirectMessage'],
    'notifications': ['Notification'],
    'core': ['MigrationOrphan'],
    'schedule': ['ScheduleSlot', 'SessionCancellation']
}

import os
# Ensure directories exist
for mod in module_mapping.keys():
    os.makedirs(f"app/modules/{mod}", exist_ok=True)
os.makedirs("app/modules/core", exist_ok=True)
os.makedirs("app/modules/schedule", exist_ok=True)

for mod, classes in module_mapping.items():
    file_content = imports + "\n"
    for cls_name in classes:
        # Regex to extract class definition including docstrings and body until the next class or end
        # We find 'class ClsName(' or 'class ClsName:'
        pattern = r"(class " + cls_name + r"\b.*?)(?=\nclass \w+\b|\Z)"
        match = re.search(pattern, content, re.DOTALL)
        if match:
            file_content += match.group(1) + "\n"
    
    with open(f"app/modules/{mod}/models.py", "w", encoding="utf-8") as out:
        out.write(file_content)

print("Models split successfully!")
