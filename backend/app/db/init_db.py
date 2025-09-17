from app.db.base import Base, engine
from app.models.user import User


def init_db() -> None:
    Base.metadata.create_all(bind=engine)