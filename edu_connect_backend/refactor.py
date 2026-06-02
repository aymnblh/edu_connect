import os
import re

def replace_imports(dir_path):
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file.endswith(".py"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Replace config imports
                content = re.sub(r'from \.*config import', 'from app.core.config import', content)
                content = re.sub(r'from app\.config import', 'from app.core.config import', content)
                
                # Replace database imports
                content = re.sub(r'from \.*database import', 'from app.db.database import', content)
                content = re.sub(r'from app\.database import', 'from app.db.database import', content)
                
                # Replace auth imports
                content = re.sub(r'from \.*auth import', 'from app.core.security import', content)
                content = re.sub(r'from app\.auth import', 'from app.core.security import', content)
                
                # Models and Schemas relative imports
                content = re.sub(r'from \.\.models import', 'from app.models import', content)
                content = re.sub(r'from \.\.schemas import', 'from app.schemas import', content)
                content = re.sub(r'from \.\.ws_manager import', 'from app.ws_manager import', content)
                content = re.sub(r'from \.\.utils', 'from app.utils', content)

                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)

replace_imports("d:/Aymen/edu/edu_connect_backend/app")
print("Done refactoring imports!")
