"""
Shared state for collaboration services
"""

from typing import Dict

# In-memory storage for document locks (in production, use Redis)
document_locks: Dict[str, str] = {}  # document_id -> user_id