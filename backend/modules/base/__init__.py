"""
FastNext Base Module

Core module providing module state tracking and management utilities.
This module is automatically installed and is a dependency for all other modules.
"""

from . import models
from . import api
from . import services

__all__ = ["models", "api", "services"]
