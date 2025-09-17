from app.db.base import Base, engine, SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.page import Page
from app.models.component import Component, ComponentInstance
from app.models.asset import Asset
from app.db.seed_components import seed_components_if_empty


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    
    # Seed default components
    db = SessionLocal()
    try:
        seed_components_if_empty(db)
    finally:
        db.close()