#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_db
from app.models.product import Product

try:
    db = next(get_db())
    products = db.query(Product).all()
    print(f'Found {len(products)} products in database')
    for p in products[:3]:
        print(f'- {p.name}: ${p.price}')
    db.close()
except Exception as e:
    print(f'Database error: {e}')
    import traceback
    traceback.print_exc()