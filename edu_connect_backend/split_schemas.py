import re
import os

with open("app/schemas.py", "r", encoding="utf-8") as f:
    content = f.read()

imports = '''from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import List, Optional, Any
from app.models import UserRole, AttendanceStatus, RemarkType, ConversationType
'''

module_mapping = {
    'auth': ['Token', 'TokenData', 'UserCreate', 'LoginRequest', 'TeacherSignup', 'VerificationRequestCreate', 'VerificationRequestOut', 'UserResponse', 'VerifyTokenRequest'],
    'users': ['UserOut', 'UserUpdate', 'StudentBase', 'StudentCreate', 'StudentOut', 'TeacherSimpleOut', 'StudentDetailedOut'],
    'schools': ['SchoolBase', 'SchoolCreate', 'SchoolOut', 'SchoolStats', 'TenantConfigOut', 'SchoolSettingsUpdate'],
    'academics': ['ClassBase', 'ClassCreate', 'ClassOut', 'JoinClassRequest', 'ClassCourseAssign', 'ClassCourseOut', 'ClassStudentEnroll', 'GradeCreate', 'GradeOut', 'HomeworkCreate', 'HomeworkOut', 'CourseCreate', 'CourseOut'],
    'attendance': ['AttendanceCreate', 'AttendanceUpdate', 'AttendanceOut', 'RemarkCreate', 'RemarkOut'],
    'messaging': ['MessageCreate', 'MessageOut', 'ConversationCreate', 'ConversationOut', 'DirectMessageCreate', 'DirectMessageOut', 'ParticipantAdd'],
    'notifications': ['NotificationOut'],
    'schedule': ['ScheduleSlotCreate', 'ScheduleSlotUpdate', 'ScheduleSlotOut', 'SessionCancellationCreate', 'SessionCancellationOut']
}

for mod, classes in module_mapping.items():
    file_content = imports + "\n"
    for cls_name in classes:
        pattern = r"(class " + cls_name + r"\b.*?)(?=\nclass \w+\b|\Z)"
        match = re.search(pattern, content, re.DOTALL)
        if match:
            file_content += match.group(1) + "\n"
    
    os.makedirs(f"app/modules/{mod}", exist_ok=True)
    with open(f"app/modules/{mod}/schemas.py", "w", encoding="utf-8") as out:
        out.write(file_content)

print("Schemas split successfully!")
