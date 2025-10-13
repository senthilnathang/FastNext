#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

from app.db.session import get_db
from app.models.user import User

try:
    db = next(get_db())
    users = db.query(User).all()
    print(f'Found {len(users)} users in database')
    for u in users[:3]:
        print(f'- {u.username} ({u.email}): {"Active" if u.is_active else "Inactive"}')
    db.close()
except Exception as e:
    print(f'Database error: {e}')
    import traceback
    traceback.print_exc()