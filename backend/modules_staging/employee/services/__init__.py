"""
Employee Services
"""

from .employee_service import EmployeeService

# V2 Service using CRUD Framework
from .employee_service_v2 import (
    EmployeeServiceV2,
    EmployeeDocumentService,
    EmployeeSkillService,
    get_employee_service,
)

__all__ = [
    # Original service
    "EmployeeService",
    # V2 CRUD Framework services
    "EmployeeServiceV2",
    "EmployeeDocumentService",
    "EmployeeSkillService",
    "get_employee_service",
]
