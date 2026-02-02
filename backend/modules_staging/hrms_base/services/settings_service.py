"""
Settings Service

Business logic for HRMS settings operations.
"""

from typing import Any, List, Optional, Tuple

from sqlalchemy.orm import Session

from ..models.settings import HRMSSettings, StageDefinition, StatusDefinition, StatusTransition
from ..schemas.settings import (
    HRMSSettingsCreate, HRMSSettingsUpdate,
    StageDefinitionCreate, StageDefinitionUpdate,
    StatusDefinitionCreate, StatusDefinitionUpdate,
    StatusTransitionCreate
)


class SettingsService:
    """Service class for HRMS settings operations."""

    def __init__(self, db: Session):
        self.db = db

    # HRMS Settings Methods
    def get_setting(self, key: str, company_id: int, module: str = "hrms_base") -> Optional[HRMSSettings]:
        """Get a setting by key."""
        return self.db.query(HRMSSettings).filter(
            HRMSSettings.key == key,
            HRMSSettings.module == module,
            HRMSSettings.company_id == company_id
        ).first()

    def get_setting_value(self, key: str, company_id: int, module: str = "hrms_base", default: Any = None) -> Any:
        """Get a setting value by key."""
        setting = self.get_setting(key, company_id, module)
        if setting:
            return setting.get_value()
        return default

    def list_settings(
        self,
        company_id: int,
        module: Optional[str] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[HRMSSettings], int]:
        """List settings with filtering."""
        query = self.db.query(HRMSSettings).filter(
            HRMSSettings.company_id == company_id
        )

        if module:
            query = query.filter(HRMSSettings.module == module)

        if category:
            query = query.filter(HRMSSettings.category == category)

        total = query.count()
        settings = query.order_by(HRMSSettings.module, HRMSSettings.key).offset(skip).limit(limit).all()

        return settings, total

    def set_setting(self, data: HRMSSettingsCreate, company_id: int, user_id: int) -> HRMSSettings:
        """Create or update a setting."""
        setting = self.get_setting(data.key, company_id, data.module)

        if setting:
            for field, value in data.model_dump().items():
                setattr(setting, field, value)
            setting.updated_by = user_id
        else:
            setting = HRMSSettings(
                **data.model_dump(),
                company_id=company_id,
                created_by=user_id
            )
            self.db.add(setting)

        self.db.commit()
        self.db.refresh(setting)
        return setting

    def delete_setting(self, key: str, company_id: int, module: str = "hrms_base") -> bool:
        """Delete a setting."""
        setting = self.get_setting(key, company_id, module)
        if not setting or setting.is_system:
            return False

        self.db.delete(setting)
        self.db.commit()
        return True

    # Stage Definition Methods
    def get_stage(self, stage_id: int, company_id: int) -> Optional[StageDefinition]:
        """Get a stage definition by ID."""
        return self.db.query(StageDefinition).filter(
            StageDefinition.id == stage_id,
            StageDefinition.company_id == company_id,
            StageDefinition.is_deleted == False
        ).first()

    def list_stages(
        self,
        company_id: int,
        model_name: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[StageDefinition], int]:
        """List stages for a model."""
        query = self.db.query(StageDefinition).filter(
            StageDefinition.company_id == company_id,
            StageDefinition.model_name == model_name,
            StageDefinition.is_deleted == False
        )

        total = query.count()
        stages = query.order_by(StageDefinition.sequence).offset(skip).limit(limit).all()

        return stages, total

    def create_stage(self, data: StageDefinitionCreate, company_id: int, user_id: int) -> StageDefinition:
        """Create a stage definition."""
        stage = StageDefinition(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(stage)
        self.db.commit()
        self.db.refresh(stage)
        return stage

    def update_stage(
        self,
        stage_id: int,
        data: StageDefinitionUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[StageDefinition]:
        """Update a stage definition."""
        stage = self.get_stage(stage_id, company_id)
        if not stage:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(stage, field, value)

        stage.updated_by = user_id
        self.db.commit()
        self.db.refresh(stage)
        return stage

    # Status Definition Methods
    def get_status(self, status_id: int, company_id: int) -> Optional[StatusDefinition]:
        """Get a status definition by ID."""
        return self.db.query(StatusDefinition).filter(
            StatusDefinition.id == status_id,
            StatusDefinition.company_id == company_id,
            StatusDefinition.is_deleted == False
        ).first()

    def list_statuses(
        self,
        company_id: int,
        model_name: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[StatusDefinition], int]:
        """List statuses for a model."""
        query = self.db.query(StatusDefinition).filter(
            StatusDefinition.company_id == company_id,
            StatusDefinition.model_name == model_name,
            StatusDefinition.is_deleted == False
        )

        total = query.count()
        statuses = query.order_by(StatusDefinition.sequence).offset(skip).limit(limit).all()

        return statuses, total

    def create_status(self, data: StatusDefinitionCreate, company_id: int, user_id: int) -> StatusDefinition:
        """Create a status definition."""
        status = StatusDefinition(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(status)
        self.db.commit()
        self.db.refresh(status)
        return status

    # Status Transition Methods
    def list_transitions(
        self,
        company_id: int,
        from_status_id: Optional[int] = None,
    ) -> List[StatusTransition]:
        """List available transitions."""
        query = self.db.query(StatusTransition).filter(
            StatusTransition.company_id == company_id,
            StatusTransition.is_active == True
        )

        if from_status_id:
            query = query.filter(StatusTransition.from_status_id == from_status_id)

        return query.all()

    def create_transition(self, data: StatusTransitionCreate, company_id: int, user_id: int) -> StatusTransition:
        """Create a status transition."""
        transition = StatusTransition(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(transition)
        self.db.commit()
        self.db.refresh(transition)
        return transition
