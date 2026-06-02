import sys
import os
sys.path.append('d:/Aymen/edu/edu_connect_backend')
from app.models import Base

for t in Base.metadata.tables.values():
    has_school_id = 'school_id' in t.c
    print(f'{t.name}: {has_school_id}')
