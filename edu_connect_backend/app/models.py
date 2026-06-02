# This file is kept for backwards compatibility with existing routers.
# It acts as a facade, re-exporting all models from their new modular locations.
# Once routers are fully refactored, this file can be deleted.

from app.modules.auth.models import *
from app.modules.users.models import *
from app.modules.schools.models import *
from app.modules.academics.models import *
from app.modules.attendance.models import *
from app.modules.messaging.models import *
from app.modules.notifications.models import *
from app.modules.core.models import *
from app.modules.schedule.models import *
from app.modules.finance.models import *
