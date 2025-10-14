"""
Database Replication and Read/Write Splitting
Automatically routes read queries to replicas and write queries to primary
"""

import logging
import random
from contextlib import contextmanager
from typing import List, Optional

from app.core.config import settings
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import QueuePool

logger = logging.getLogger(__name__)


class DatabaseRouter:
    """
    Intelligent database router for read/write splitting

    Routes:
    - Write operations (INSERT, UPDATE, DELETE) -> Primary
    - Read operations (SELECT) -> Read replicas (load balanced)
    - Transactions -> Primary
    """

    def __init__(self):
        self.primary_uri = settings.SQLALCHEMY_DATABASE_URI
        self.replica_uris = self._parse_replica_uris()

        # Create engines
        self.primary_engine = self._create_engine(self.primary_uri, pool_size=20)
        self.replica_engines = [
            self._create_engine(uri, pool_size=10) for uri in self.replica_uris
        ]

        # Session makers
        self.PrimarySession = sessionmaker(bind=self.primary_engine)
        self.ReplicaSessions = [
            sessionmaker(bind=engine) for engine in self.replica_engines
        ]

        # Track replica health
        self.replica_health = [True] * len(self.replica_engines)

        logger.info(
            f"Database router initialized: 1 primary, {len(self.replica_engines)} replicas"
        )

    def _parse_replica_uris(self) -> List[str]:
        """Parse replica connection strings from environment"""
        replica_str = getattr(settings, "POSTGRES_READ_REPLICAS", "")

        if not replica_str:
            logger.warning("No read replicas configured")
            return []

        replicas = []
        for replica_host in replica_str.split(","):
            replica_host = replica_host.strip()
            if replica_host:
                # Build replica URI
                uri = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{replica_host}/{settings.POSTGRES_DB}"
                replicas.append(uri)

        return replicas

    def _create_engine(self, uri: str, pool_size: int = 10):
        """Create database engine with optimized settings"""
        return create_engine(
            uri,
            pool_pre_ping=True,
            pool_size=pool_size,
            max_overflow=pool_size * 2,
            pool_timeout=30,
            pool_recycle=3600,
            poolclass=QueuePool,
            echo=False,
            execution_options={"isolation_level": "READ COMMITTED"},
        )

    def get_primary_session(self) -> Session:
        """Get session connected to primary database (for writes)"""
        return self.PrimarySession()

    def get_replica_session(self) -> Session:
        """Get session connected to read replica (for reads) with load balancing"""
        if not self.replica_engines:
            # No replicas, use primary
            logger.debug("No replicas available, using primary for read")
            return self.PrimarySession()

        # Get healthy replicas
        healthy_replicas = [
            (idx, session_maker)
            for idx, session_maker in enumerate(self.ReplicaSessions)
            if self.replica_health[idx]
        ]

        if not healthy_replicas:
            logger.warning("All replicas unhealthy, falling back to primary")
            return self.PrimarySession()

        # Random load balancing among healthy replicas
        idx, session_maker = random.choice(healthy_replicas)
        logger.debug(f"Using replica {idx} for read query")

        return session_maker()

    def mark_replica_unhealthy(self, replica_idx: int):
        """Mark a replica as unhealthy"""
        if 0 <= replica_idx < len(self.replica_health):
            self.replica_health[replica_idx] = False
            logger.warning(f"Replica {replica_idx} marked as unhealthy")

    def mark_replica_healthy(self, replica_idx: int):
        """Mark a replica as healthy"""
        if 0 <= replica_idx < len(self.replica_health):
            self.replica_health[replica_idx] = True
            logger.info(f"Replica {replica_idx} marked as healthy")

    async def health_check_replicas(self):
        """Check health of all replicas"""
        for idx, engine in enumerate(self.replica_engines):
            try:
                with engine.connect() as conn:
                    conn.execute("SELECT 1")
                self.mark_replica_healthy(idx)
            except Exception as e:
                logger.error(f"Replica {idx} health check failed: {e}")
                self.mark_replica_unhealthy(idx)


# Global router instance
db_router = DatabaseRouter()


class RoutedSession(Session):
    """
    Session that automatically routes queries based on operation type

    - Read queries -> Replicas
    - Write queries -> Primary
    - Transactions -> Primary
    """

    def __init__(self, *args, **kwargs):
        self._force_primary = kwargs.pop("force_primary", False)
        self._in_transaction = False
        super().__init__(*args, **kwargs)

    def execute(self, *args, **kwargs):
        """Override execute to route based on query type"""
        # Get the statement
        statement = args[0] if args else None

        # Determine if it's a read or write operation
        if self._should_use_replica(statement):
            # Use replica for reads
            if not self._force_primary and not self._in_transaction:
                try:
                    replica_session = db_router.get_replica_session()
                    return replica_session.execute(*args, **kwargs)
                except Exception as e:
                    logger.warning(
                        f"Replica query failed, falling back to primary: {e}"
                    )

        # Use primary for writes or fallback
        return super().execute(*args, **kwargs)

    def _should_use_replica(self, statement) -> bool:
        """Determine if query should use replica"""
        if not statement:
            return False

        statement_str = str(statement).strip().upper()

        # Check if it's a SELECT query
        if statement_str.startswith("SELECT"):
            # Avoid routing SELECT FOR UPDATE to replicas
            if "FOR UPDATE" in statement_str or "FOR SHARE" in statement_str:
                return False
            return True

        return False

    def begin(self, *args, **kwargs):
        """Mark that we're in a transaction (use primary)"""
        self._in_transaction = True
        return super().begin(*args, **kwargs)

    def commit(self, *args, **kwargs):
        """Commit and end transaction"""
        result = super().commit(*args, **kwargs)
        self._in_transaction = False
        return result

    def rollback(self, *args, **kwargs):
        """Rollback and end transaction"""
        result = super().rollback(*args, **kwargs)
        self._in_transaction = False
        return result


# Session factory with routing
RoutedSessionLocal = sessionmaker(
    class_=RoutedSession,
    bind=db_router.primary_engine,
    autocommit=False,
    autoflush=False,
)


@contextmanager
def get_db_session(force_primary: bool = False):
    """
    Get database session with automatic routing

    Args:
        force_primary: Force use of primary database (for critical operations)
    """
    session = RoutedSessionLocal(force_primary=force_primary)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_write_session() -> Session:
    """Get session explicitly for write operations (always primary)"""
    return db_router.get_primary_session()


def get_read_session() -> Session:
    """Get session explicitly for read operations (prefers replicas)"""
    return db_router.get_replica_session()


class ReplicationMonitor:
    """Monitor replication lag and replica health"""

    @staticmethod
    async def check_replication_lag(db: Session) -> dict:
        """Check replication lag on replicas"""
        lag_info = {}

        for idx, engine in enumerate(db_router.replica_engines):
            try:
                with engine.connect() as conn:
                    # Check if replica is in recovery mode
                    result = conn.execute("SELECT pg_is_in_recovery()")
                    is_replica = result.scalar()

                    if is_replica:
                        # Get replication lag
                        result = conn.execute(
                            """
                            SELECT
                                EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::INTEGER as lag_seconds,
                                pg_last_xact_replay_timestamp() as last_replay
                        """
                        )
                        row = result.fetchone()

                        lag_info[f"replica_{idx}"] = {
                            "healthy": True,
                            "lag_seconds": row[0] if row[0] else 0,
                            "last_replay": str(row[1]) if row[1] else None,
                            "status": "OK" if (row[0] or 0) < 5 else "LAGGING",
                        }
                    else:
                        lag_info[f"replica_{idx}"] = {
                            "healthy": True,
                            "status": "NOT_REPLICA",
                        }

            except Exception as e:
                logger.error(f"Failed to check lag on replica {idx}: {e}")
                lag_info[f"replica_{idx}"] = {"healthy": False, "error": str(e)}

        return lag_info

    @staticmethod
    async def get_replication_stats(db: Session) -> dict:
        """Get comprehensive replication statistics"""
        stats = {
            "primary": {},
            "replicas": await ReplicationMonitor.check_replication_lag(db),
        }

        # Get primary stats
        try:
            with db_router.primary_engine.connect() as conn:
                # Check if primary is in recovery (shouldn't be)
                result = conn.execute("SELECT pg_is_in_recovery()")
                is_primary = not result.scalar()

                if is_primary:
                    # Get WAL position
                    result = conn.execute("SELECT pg_current_wal_lsn()")
                    wal_lsn = result.scalar()

                    # Get replication connections
                    result = conn.execute(
                        """
                        SELECT
                            client_addr,
                            state,
                            sync_state,
                            replay_lsn,
                            write_lsn
                        FROM pg_stat_replication
                    """
                    )

                    replication_connections = [
                        {
                            "client_addr": row[0],
                            "state": row[1],
                            "sync_state": row[2],
                            "replay_lsn": row[3],
                            "write_lsn": row[4],
                        }
                        for row in result.fetchall()
                    ]

                    stats["primary"] = {
                        "is_primary": True,
                        "wal_lsn": str(wal_lsn),
                        "connected_replicas": len(replication_connections),
                        "replication_connections": replication_connections,
                    }
                else:
                    stats["primary"] = {
                        "is_primary": False,
                        "warning": "Primary is in recovery mode!",
                    }

        except Exception as e:
            logger.error(f"Failed to get primary stats: {e}")
            stats["primary"] = {"error": str(e)}

        return stats


# Initialize replication monitoring
replication_monitor = ReplicationMonitor()
