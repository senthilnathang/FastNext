#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

from app.db.session import get_db
from app.models.permission import Permission

try:
    db = next(get_db())
    permissions = db.query(Permission).all()
    print(f'Found {len(permissions)} permissions in database')
    for p in permissions:
        print(f'- {p.name} ({p.resource}.{p.action}): {p.description}')
    db.close()
except Exception as e:
    print(f'Database error: {e}')
    import traceback
    traceback.print_exc()