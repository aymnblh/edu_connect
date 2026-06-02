from fastapi import APIRouter

# Import all module routers
from app.modules.auth.routers import auth, verification, onboarding
from app.modules.users.routers import users
from app.modules.schools.routers import admin, platform, system
from app.modules.academics.routers import classes, grades, homework, lessons
from app.modules.attendance.routers import attendance, remarks
from app.modules.messaging.routers import chat, dm
from app.modules.notifications.routers import notifications
from app.modules.schedule.routers import schedule
from app.modules.finance.routers import finance
from app.modules.core.routers import media, security

api_router = APIRouter()

# Authentication & Onboarding
api_router.include_router(auth.router)
api_router.include_router(verification.router)
api_router.include_router(onboarding.router)

# Users
api_router.include_router(users.router)

# Schools
api_router.include_router(admin.router)
api_router.include_router(platform.router)
api_router.include_router(system.router)

# Academics
api_router.include_router(classes.router)
api_router.include_router(grades.router)
api_router.include_router(homework.router)
api_router.include_router(lessons.router)

# Attendance
api_router.include_router(attendance.router)
api_router.include_router(remarks.router)

# Messaging
api_router.include_router(chat.router)
api_router.include_router(dm.router)

# Notifications
api_router.include_router(notifications.router)

# Schedule
api_router.include_router(schedule.router)

# Finance
api_router.include_router(finance.router)

# Security & Audit
api_router.include_router(security.router)
api_router.include_router(media.router)
