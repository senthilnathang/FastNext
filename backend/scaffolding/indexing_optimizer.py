"""
Database Indexing Optimization for Backend Scaffolding

Generates optimized database indexes including:
- Primary and foreign key indexes
- Composite indexes for common query patterns
- Unique constraints and partial indexes
- Full-text search indexes
- Performance monitoring and analysis tools
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .backend_generator import FieldDefinition, FieldType, ModelDefinition


class IndexType:
    """Database index types"""

    BTREE = "btree"
    HASH = "hash"
    GIN = "gin"  # For JSON, arrays
    GIST = "gist"  # For geometric, full-text
    BRIN = "brin"  # For large tables with natural ordering
    PARTIAL = "partial"
    UNIQUE = "unique"
    COMPOSITE = "composite"


class IndexingOptimizer:
    """Generate optimized database indexes and performance tools"""

    def __init__(self, model_def: ModelDefinition, base_path: str = "."):
        self.model_def = model_def
        self.base_path = Path(base_path)
        self.model_name = model_def.name
        self.snake_name = model_def.name.lower()
        self.table_name = model_def.table_name

    def generate_all_optimizations(self):
        """Generate complete indexing optimization suite"""
        print(f"⚡ Generating database optimizations for {self.model_name}...")

        # Generate index analysis
        self.generate_index_analysis()

        # Generate index migration
        self.generate_index_migration()

        # Generate performance monitoring
        self.generate_performance_monitoring()

        # Generate query optimization guides
        self.generate_query_optimization()

        # Generate index maintenance tools
        self.generate_index_maintenance()

        print(f"✅ Database optimizations generated for {self.model_name}")

    def generate_index_analysis(self):
        """Analyze model and generate optimal index recommendations"""
        content = f'''"""
Automated Index Analysis for {self.model_name}
Generated based on field types, relationships, and common query patterns
"""

from typing import Dict, List, Tuple, Optional
from sqlalchemy import text, Index
from sqlalchemy.orm import Session

from app.models.{self.snake_name} import {self.model_name}
from app.db.session import SessionLocal


class {self.model_name}IndexAnalysis:
    """Analysis and recommendations for {self.model_name} indexes"""

    def __init__(self):
        self.table_name = "{self.table_name}"
        self.model = {self.model_name}

    def get_recommended_indexes(self) -> List[Dict[str, Any]]:
        """Get recommended indexes based on field analysis"""
        recommendations = []

        # Primary key index (usually automatic)
        recommendations.append({{
            "name": f"idx_{{{self.table_name}}}_pkey",
            "type": "primary",
            "columns": ["id"],
            "reason": "Primary key for unique row identification",
            "priority": "critical"
        }})

'''

        # Analyze each field for indexing opportunities
        for field in self.model_def.fields:
            if field.name in ["id", "created_at", "updated_at"]:
                continue

            # Foreign key indexes
            if field.type == FieldType.FOREIGN_KEY:
                content += f"""        # Foreign key index for {field.name}
        recommendations.append({{
            "name": f"idx_{{{self.table_name}}}_{field.name}",
            "type": "btree",
            "columns": ["{field.name}"],
            "reason": "Foreign key for joins and referential integrity",
            "priority": "high",
            "estimated_selectivity": 0.1
        }})

"""

            # Unique field indexes
            if field.unique:
                content += f"""        # Unique constraint index for {field.name}
        recommendations.append({{
            "name": f"idx_{{{self.table_name}}}_{field.name}_unique",
            "type": "unique",
            "columns": ["{field.name}"],
            "reason": "Unique constraint enforcement and fast lookups",
            "priority": "high",
            "estimated_selectivity": 1.0
        }})

"""

            # Search-optimized indexes
            if (
                field.type in [FieldType.STRING, FieldType.TEXT]
                and self.model_def.enable_search
            ):
                content += f"""        # Search optimization for {field.name}
        recommendations.append({{
            "name": f"idx_{{{self.table_name}}}_{field.name}_search",
            "type": "gin",
            "columns": ["{field.name}"],
            "reason": "Full-text search optimization",
            "priority": "medium",
            "postgresql_only": True,
            "expression": f"to_tsvector('english', {field.name})"
        }})

        # Case-insensitive search index for {field.name}
        recommendations.append({{
            "name": f"idx_{{{self.table_name}}}_{field.name}_ilike",
            "type": "btree",
            "columns": ["{field.name}"],
            "reason": "Case-insensitive pattern matching",
            "priority": "low",
            "expression": f"lower({field.name})"
        }})

"""

            # Filtering indexes for common filter fields
            if field.type in [FieldType.BOOLEAN, FieldType.ENUM]:
                content += f"""        # Filter index for {field.name}
        recommendations.append({{
            "name": f"idx_{{{self.table_name}}}_{field.name}_filter",
            "type": "btree",
            "columns": ["{field.name}"],
            "reason": "Common filtering by {field.name}",
            "priority": "medium",
            "estimated_selectivity": 0.5
        }})

"""

            # Date/datetime indexes for temporal queries
            if field.type in [FieldType.DATE, FieldType.DATETIME]:
                content += f"""        # Temporal range index for {field.name}
        recommendations.append({{
            "name": f"idx_{{{self.table_name}}}_{field.name}_range",
            "type": "btree",
            "columns": ["{field.name}"],
            "reason": "Date range queries and temporal sorting",
            "priority": "medium",
            "estimated_selectivity": 0.3
        }})

"""

            # JSON field indexes
            if field.type == FieldType.JSON:
                content += f"""        # JSON field index for {field.name}
        recommendations.append({{
            "name": f"idx_{{{self.table_name}}}_{field.name}_gin",
            "type": "gin",
            "columns": ["{field.name}"],
            "reason": "JSON key/value searches and containment queries",
            "priority": "medium",
            "postgresql_only": True
        }})

"""

        # Add composite indexes for common query patterns
        content += f"""        # Common composite indexes

        # Sorting and filtering composite
        recommendations.append({{
            "name": f"idx_{{{self.table_name}}}_sort_filter",
            "type": "composite",
            "columns": ["created_at", "id"],
            "reason": "Optimized sorting with stable ordering",
            "priority": "high",
            "estimated_selectivity": 0.01
        }})

"""

        # Add project-scoped indexes if applicable
        if self.model_def.project_scoped:
            content += f"""        # Project-scoped access pattern
        recommendations.append({{
            "name": f"idx_{{{self.table_name}}}_project_scope",
            "type": "composite",
            "columns": ["project_id", "created_at"],
            "reason": "Project-scoped queries with temporal sorting",
            "priority": "high",
            "estimated_selectivity": 0.05
        }})

"""

        # Add ownership indexes if applicable
        if self.model_def.owner_field:
            content += f"""        # Owner-based access pattern
        recommendations.append({{
            "name": f"idx_{{{self.table_name}}}_owner_access",
            "type": "composite",
            "columns": ["{self.model_def.owner_field}", "created_at"],
            "reason": "Owner-based queries with temporal sorting",
            "priority": "high",
            "estimated_selectivity": 0.1
        }})

"""

        # Add soft delete index if applicable
        if any(f.name == "is_deleted" for f in self.model_def.fields):
            content += f"""        # Soft delete optimization
        recommendations.append({{
            "name": f"idx_{{{self.table_name}}}_active_records",
            "type": "partial",
            "columns": ["id"],
            "condition": "is_deleted = FALSE",
            "reason": "Optimize queries for non-deleted records",
            "priority": "high",
            "estimated_selectivity": 0.9
        }})

"""

        content += f'''        return recommendations

    def get_composite_index_recommendations(self) -> List[Dict[str, Any]]:
        """Get composite indexes for complex query patterns"""
        composites = []

'''

        # Generate composite indexes based on likely query patterns
        search_fields = [
            f
            for f in self.model_def.fields
            if f.type in [FieldType.STRING, FieldType.TEXT]
        ]
        filter_fields = [
            f
            for f in self.model_def.fields
            if f.type in [FieldType.BOOLEAN, FieldType.ENUM]
        ]

        if search_fields and filter_fields:
            search_field = search_fields[0].name
            filter_field = filter_fields[0].name
            content += f"""        # Search with filtering
        composites.append({{
            "name": f"idx_{{{self.table_name}}}_search_filter",
            "type": "composite",
            "columns": ["{filter_field}", "{search_field}"],
            "reason": "Combined search and filtering queries",
            "priority": "medium"
        }})

"""

        content += f'''        return composites

    def analyze_query_patterns(self, db: Session) -> Dict[str, Any]:
        """Analyze actual query patterns from database statistics"""
        analysis = {{
            "table_stats": {{}},
            "index_usage": {{}},
            "slow_queries": [],
            "missing_indexes": []
        }}

        try:
            # Get table statistics
            table_stats = db.execute(text("""
                SELECT
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    correlation
                FROM pg_stats
                WHERE tablename = :table_name
            """), {{"table_name": self.table_name}}).fetchall()

            analysis["table_stats"] = [{{
                "column": row.attname,
                "n_distinct": row.n_distinct,
                "correlation": row.correlation
            }} for row in table_stats]

            # Get index usage statistics
            index_stats = db.execute(text("""
                SELECT
                    indexrelname,
                    idx_tup_read,
                    idx_tup_fetch,
                    idx_scan
                FROM pg_stat_user_indexes
                WHERE relname = :table_name
            """), {{"table_name": self.table_name}}).fetchall()

            analysis["index_usage"] = [{{
                "index_name": row.indexrelname,
                "tuples_read": row.idx_tup_read,
                "tuples_fetched": row.idx_tup_fetch,
                "scans": row.idx_scan,
                "efficiency": row.idx_tup_fetch / max(row.idx_tup_read, 1) if row.idx_tup_read else 0
            }} for row in index_stats]

        except Exception as e:
            analysis["error"] = f"Could not analyze query patterns: {{str(e)}}"

        return analysis

    def estimate_index_sizes(self) -> Dict[str, int]:
        """Estimate storage requirements for recommended indexes"""
        estimates = {{}}

        # Base estimates in KB per 1000 rows
        base_estimates = {{
            "btree": 50,      # B-tree index
            "hash": 30,       # Hash index
            "gin": 100,       # GIN index (larger due to inverted structure)
            "gist": 80,       # GiST index
            "unique": 50,     # Unique B-tree
            "composite": 70   # Composite index (varies by column count)
        }}

        recommendations = self.get_recommended_indexes()

        for rec in recommendations:
            index_type = rec["type"]
            column_count = len(rec["columns"])

            # Base size estimate
            base_size = base_estimates.get(index_type, 50)

            # Adjust for composite indexes
            if index_type == "composite":
                base_size *= (column_count * 0.8)  # Diminishing returns

            # Adjust for data types
            for col_name in rec["columns"]:
                field = next((f for f in self.model_def.fields if f.name == col_name), None)
                if field:
                    if field.type in [FieldType.TEXT, FieldType.JSON]:
                        base_size *= 1.5
                    elif field.type in [FieldType.STRING] and field.max_length and field.max_length > 255:
                        base_size *= 1.3

            estimates[rec["name"]] = int(base_size)

        return estimates

    def get_maintenance_recommendations(self) -> List[Dict[str, str]]:
        """Get index maintenance recommendations"""
        return [
            {{
                "task": "Regular VACUUM",
                "frequency": "Weekly",
                "reason": "Reclaim space and update statistics",
                "command": f"VACUUM ANALYZE {{{self.table_name}}};"
            }},
            {{
                "task": "Index bloat monitoring",
                "frequency": "Monthly",
                "reason": "Detect and address index bloat",
                "command": "SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';"
            }},
            {{
                "task": "Query performance review",
                "frequency": "Quarterly",
                "reason": "Identify slow queries and missing indexes",
                "command": "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
            }}
        ]
'''

        self._write_file(
            f"app/db/analysis/{self.snake_name}_index_analysis.py", content
        )

    def generate_index_migration(self):
        """Generate database migration with optimized indexes"""
        timestamp = "1758730000"  # Use consistent timestamp for generated migration

        content = f'''"""
Optimized indexes migration for {self.model_name}

This migration creates performance-optimized indexes based on:
- Field types and characteristics
- Common query patterns
- Search and filtering requirements
- Relationship access patterns

Revision ID: {timestamp}
Revises: add_{self.table_name}
Create Date: 2023-12-01 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '{timestamp}_optimize_{self.table_name}_indexes'
down_revision = 'add_{self.table_name}'
branch_labels = None
depends_on = None


def upgrade():
    """Create optimized indexes for {self.model_name}"""

'''

        # Generate index creation commands
        for field in self.model_def.fields:
            if field.name in ["id"]:  # Skip primary key (automatic)
                continue

            # Foreign key indexes
            if field.type == FieldType.FOREIGN_KEY:
                content += f"""    # Foreign key index for {field.name}
    op.create_index(
        'idx_{self.table_name}_{field.name}',
        '{self.table_name}',
        ['{field.name}'],
        postgresql_using='btree'
    )

"""

            # Unique indexes
            if field.unique:
                content += f"""    # Unique index for {field.name}
    op.create_index(
        'idx_{self.table_name}_{field.name}_unique',
        '{self.table_name}',
        ['{field.name}'],
        unique=True,
        postgresql_using='btree'
    )

"""

            # Search indexes for text fields
            if (
                field.type in [FieldType.STRING, FieldType.TEXT]
                and self.model_def.enable_search
            ):
                content += f"""    # Full-text search index for {field.name}
    op.create_index(
        'idx_{self.table_name}_{field.name}_fts',
        '{self.table_name}',
        [sa.text("to_tsvector('english', {field.name})")],
        postgresql_using='gin'
    )

    # Case-insensitive search index for {field.name}
    op.create_index(
        'idx_{self.table_name}_{field.name}_lower',
        '{self.table_name}',
        [sa.text("lower({field.name})")],
        postgresql_using='btree'
    )

"""

            # Filter indexes for enums and booleans
            if field.type in [FieldType.BOOLEAN, FieldType.ENUM]:
                content += f"""    # Filter index for {field.name}
    op.create_index(
        'idx_{self.table_name}_{field.name}',
        '{self.table_name}',
        ['{field.name}'],
        postgresql_using='btree'
    )

"""

            # Date/time indexes
            if field.type in [FieldType.DATE, FieldType.DATETIME]:
                content += f"""    # Temporal index for {field.name}
    op.create_index(
        'idx_{self.table_name}_{field.name}',
        '{self.table_name}',
        ['{field.name}'],
        postgresql_using='btree'
    )

"""

            # JSON indexes
            if field.type == FieldType.JSON:
                content += f"""    # JSON index for {field.name}
    op.create_index(
        'idx_{self.table_name}_{field.name}_gin',
        '{self.table_name}',
        ['{field.name}'],
        postgresql_using='gin'
    )

"""

        # Composite indexes for common patterns
        content += f"""    # Composite indexes for common query patterns

    # Sort optimization (created_at + id for stable sort)
    op.create_index(
        'idx_{self.table_name}_created_at_id',
        '{self.table_name}',
        ['created_at', 'id'],
        postgresql_using='btree'
    )

"""

        # Project-scoped composite index
        if self.model_def.project_scoped:
            content += f"""    # Project-scoped access pattern
    op.create_index(
        'idx_{self.table_name}_project_created',
        '{self.table_name}',
        ['project_id', 'created_at'],
        postgresql_using='btree'
    )

"""

        # Owner-based composite index
        if self.model_def.owner_field:
            content += f"""    # Owner-based access pattern
    op.create_index(
        'idx_{self.table_name}_owner_created',
        '{self.table_name}',
        ['{self.model_def.owner_field}', 'created_at'],
        postgresql_using='btree'
    )

"""

        # Soft delete partial index
        if any(f.name == "is_deleted" for f in self.model_def.fields):
            content += f"""    # Partial index for active (non-deleted) records
    op.create_index(
        'idx_{self.table_name}_active',
        '{self.table_name}',
        ['id'],
        postgresql_where=sa.text('is_deleted = FALSE'),
        postgresql_using='btree'
    )

"""

        # Add index on updated_at for timestamp mixin
        if any(f.name == "updated_at" for f in self.model_def.fields):
            content += f"""    # Updated timestamp index for change tracking
    op.create_index(
        'idx_{self.table_name}_updated_at',
        '{self.table_name}',
        ['updated_at'],
        postgresql_where=sa.text('updated_at IS NOT NULL'),
        postgresql_using='btree'
    )

"""

        # Generate downgrade function
        content += f'''

def downgrade():
    """Remove optimized indexes for {self.model_name}"""

'''

        # Generate drop index commands (reverse order)
        indexes_to_drop = []

        for field in self.model_def.fields:
            if field.name in ["id"]:
                continue

            if field.type == FieldType.FOREIGN_KEY:
                indexes_to_drop.append(f"idx_{self.table_name}_{field.name}")

            if field.unique:
                indexes_to_drop.append(f"idx_{self.table_name}_{field.name}_unique")

            if (
                field.type in [FieldType.STRING, FieldType.TEXT]
                and self.model_def.enable_search
            ):
                indexes_to_drop.extend(
                    [
                        f"idx_{self.table_name}_{field.name}_fts",
                        f"idx_{self.table_name}_{field.name}_lower",
                    ]
                )

            if field.type in [
                FieldType.BOOLEAN,
                FieldType.ENUM,
                FieldType.DATE,
                FieldType.DATETIME,
            ]:
                indexes_to_drop.append(f"idx_{self.table_name}_{field.name}")

            if field.type == FieldType.JSON:
                indexes_to_drop.append(f"idx_{self.table_name}_{field.name}_gin")

        # Add composite and special indexes
        indexes_to_drop.extend([f"idx_{self.table_name}_created_at_id"])

        if self.model_def.project_scoped:
            indexes_to_drop.append(f"idx_{self.table_name}_project_created")

        if self.model_def.owner_field:
            indexes_to_drop.append(f"idx_{self.table_name}_owner_created")

        if any(f.name == "is_deleted" for f in self.model_def.fields):
            indexes_to_drop.append(f"idx_{self.table_name}_active")

        if any(f.name == "updated_at" for f in self.model_def.fields):
            indexes_to_drop.append(f"idx_{self.table_name}_updated_at")

        for index_name in reversed(indexes_to_drop):
            content += f"""    op.drop_index('{index_name}', table_name='{self.table_name}')
"""

        self._write_file(
            f"migrations/versions/{timestamp}_optimize_{self.table_name}_indexes.py",
            content,
        )

    def generate_performance_monitoring(self):
        """Generate performance monitoring tools"""
        content = f'''"""
Performance monitoring tools for {self.model_name}

Provides utilities to monitor query performance, index usage,
and identify optimization opportunities.
"""

from typing import Dict, List, Any, Optional
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.models.{self.snake_name} import {self.model_name}
from app.db.session import SessionLocal


@dataclass
class QueryStats:
    """Query performance statistics"""
    query_hash: str
    query: str
    calls: int
    total_time: float
    mean_time: float
    min_time: float
    max_time: float
    rows_returned: int


@dataclass
class IndexStats:
    """Index usage statistics"""
    index_name: str
    table_name: str
    scans: int
    tuples_read: int
    tuples_fetched: int
    efficiency: float
    size_mb: float


class {self.model_name}PerformanceMonitor:
    """Performance monitoring for {self.model_name} operations"""

    def __init__(self, db: Session = None):
        self.db = db or SessionLocal()
        self.table_name = "{self.table_name}"

    def get_slow_queries(self,
                        min_calls: int = 10,
                        min_mean_time: float = 100.0) -> List[QueryStats]:
        """Get slow queries related to {self.model_name} table"""
        try:
            # Requires pg_stat_statements extension
            result = self.db.execute(text("""
                SELECT
                    queryid::text as query_hash,
                    query,
                    calls,
                    total_time,
                    mean_time,
                    min_time,
                    max_time,
                    rows
                FROM pg_stat_statements
                WHERE query LIKE :table_pattern
                    AND calls >= :min_calls
                    AND mean_time >= :min_mean_time
                ORDER BY mean_time DESC
                LIMIT 20
            """), {{
                "table_pattern": f"%{self.table_name}%",
                "min_calls": min_calls,
                "min_mean_time": min_mean_time
            }})

            return [
                QueryStats(
                    query_hash=row.query_hash,
                    query=row.query[:200] + "..." if len(row.query) > 200 else row.query,
                    calls=row.calls,
                    total_time=row.total_time,
                    mean_time=row.mean_time,
                    min_time=row.min_time,
                    max_time=row.max_time,
                    rows_returned=row.rows
                ) for row in result
            ]
        except Exception as e:
            print(f"Could not get slow queries: {{e}}")
            return []

    def get_index_usage(self) -> List[IndexStats]:
        """Get index usage statistics for {self.model_name}"""
        try:
            result = self.db.execute(text("""
                SELECT
                    i.indexrelname as index_name,
                    i.relname as table_name,
                    i.idx_scan as scans,
                    i.idx_tup_read as tuples_read,
                    i.idx_tup_fetch as tuples_fetched,
                    pg_size_pretty(pg_relation_size(indexrelid)) as size,
                    pg_relation_size(indexrelid) / 1024.0 / 1024.0 as size_mb
                FROM pg_stat_user_indexes i
                WHERE i.relname = :table_name
                ORDER BY i.idx_scan DESC
            """), {{"table_name": self.table_name}})

            stats = []
            for row in result:
                efficiency = 0.0
                if row.tuples_read > 0:
                    efficiency = row.tuples_fetched / row.tuples_read

                stats.append(IndexStats(
                    index_name=row.index_name,
                    table_name=row.table_name,
                    scans=row.scans,
                    tuples_read=row.tuples_read,
                    tuples_fetched=row.tuples_fetched,
                    efficiency=efficiency,
                    size_mb=row.size_mb
                ))

            return stats

        except Exception as e:
            print(f"Could not get index usage: {{e}}")
            return []

    def get_table_stats(self) -> Dict[str, Any]:
        """Get table statistics for {self.model_name}"""
        try:
            # Get basic table info
            table_info = self.db.execute(text("""
                SELECT
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    n_live_tup as live_rows,
                    n_dead_tup as dead_rows,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze,
                    seq_scan,
                    seq_tup_read,
                    idx_scan,
                    idx_tup_fetch
                FROM pg_stat_user_tables
                WHERE relname = :table_name
            """), {{"table_name": self.table_name}}).fetchone()

            if not table_info:
                return {{"error": "Table statistics not found"}}

            # Get table size
            size_info = self.db.execute(text("""
                SELECT
                    pg_size_pretty(pg_total_relation_size(:table_name)) as total_size,
                    pg_size_pretty(pg_relation_size(:table_name)) as table_size,
                    pg_total_relation_size(:table_name) / 1024.0 / 1024.0 as total_mb,
                    pg_relation_size(:table_name) / 1024.0 / 1024.0 as table_mb
            """), {{"table_name": self.table_name}}).fetchone()

            return {{
                "operations": {{
                    "inserts": table_info.inserts,
                    "updates": table_info.updates,
                    "deletes": table_info.deletes
                }},
                "rows": {{
                    "live": table_info.live_rows,
                    "dead": table_info.dead_rows,
                    "total": table_info.live_rows + table_info.dead_rows
                }},
                "maintenance": {{
                    "last_vacuum": table_info.last_vacuum,
                    "last_autovacuum": table_info.last_autovacuum,
                    "last_analyze": table_info.last_analyze,
                    "last_autoanalyze": table_info.last_autoanalyze
                }},
                "access_patterns": {{
                    "sequential_scans": table_info.seq_scan,
                    "sequential_reads": table_info.seq_tup_read,
                    "index_scans": table_info.idx_scan,
                    "index_fetches": table_info.idx_tup_fetch,
                    "index_ratio": table_info.idx_scan / max(table_info.seq_scan + table_info.idx_scan, 1)
                }},
                "storage": {{
                    "total_size": size_info.total_size,
                    "table_size": size_info.table_size,
                    "total_mb": size_info.total_mb,
                    "table_mb": size_info.table_mb
                }}
            }}

        except Exception as e:
            return {{"error": f"Could not get table stats: {{e}}"}}

    def analyze_query_performance(self,
                                query: str,
                                params: Dict = None) -> Dict[str, Any]:
        """Analyze performance of a specific query"""
        try:
            # Get query plan
            explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {{query}}"

            result = self.db.execute(text(explain_query), params or {{}})
            plan = result.fetchone()[0]

            return {{
                "query": query,
                "execution_time_ms": plan[0]["Execution Time"],
                "planning_time_ms": plan[0]["Planning Time"],
                "total_cost": plan[0]["Plan"]["Total Cost"],
                "actual_rows": plan[0]["Plan"]["Actual Rows"],
                "plan": plan[0]["Plan"],
                "analysis": self._analyze_plan(plan[0]["Plan"])
            }}

        except Exception as e:
            return {{"error": f"Could not analyze query: {{e}}"}}

    def _analyze_plan(self, plan: Dict) -> Dict[str, Any]:
        """Analyze query execution plan"""
        analysis = {{
            "issues": [],
            "recommendations": []
        }}

        def analyze_node(node):
            # Check for sequential scans
            if node.get("Node Type") == "Seq Scan":
                analysis["issues"].append({{
                    "type": "sequential_scan",
                    "table": node.get("Relation Name"),
                    "cost": node.get("Total Cost"),
                    "rows": node.get("Actual Rows")
                }})
                analysis["recommendations"].append(
                    f"Consider adding index for table {{node.get('Relation Name')}}"
                )

            # Check for high cost operations
            if node.get("Total Cost", 0) > 1000:
                analysis["issues"].append({{
                    "type": "high_cost",
                    "operation": node.get("Node Type"),
                    "cost": node.get("Total Cost")
                }})

            # Check nested loops with high row counts
            if (node.get("Node Type") == "Nested Loop" and
                node.get("Actual Rows", 0) > 10000):
                analysis["issues"].append({{
                    "type": "expensive_nested_loop",
                    "rows": node.get("Actual Rows"),
                    "cost": node.get("Total Cost")
                }})
                analysis["recommendations"].append(
                    "Consider adding indexes to enable hash or merge joins"
                )

            # Recursively analyze child plans
            for child in node.get("Plans", []):
                analyze_node(child)

        analyze_node(plan)
        return analysis

    def get_missing_indexes(self) -> List[Dict[str, str]]:
        """Identify potentially missing indexes"""
        recommendations = []

        # Check for tables accessed via sequential scan
        try:
            result = self.db.execute(text("""
                SELECT
                    schemaname,
                    tablename,
                    seq_scan,
                    seq_tup_read,
                    idx_scan,
                    n_live_tup
                FROM pg_stat_user_tables
                WHERE tablename = :table_name
                    AND seq_scan > idx_scan
                    AND n_live_tup > 1000
            """), {{"table_name": self.table_name}})

            for row in result:
                recommendations.append({{
                    "table": row.tablename,
                    "issue": "High sequential scan ratio",
                    "details": f"{{row.seq_scan}} seq scans vs {{row.idx_scan}} index scans",
                    "recommendation": "Review query patterns and add appropriate indexes"
                }})

        except Exception as e:
            print(f"Could not analyze missing indexes: {{e}}")

        return recommendations

    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        return {{
            "timestamp": datetime.utcnow().isoformat(),
            "table": self.table_name,
            "table_stats": self.get_table_stats(),
            "slow_queries": self.get_slow_queries(),
            "index_usage": self.get_index_usage(),
            "missing_indexes": self.get_missing_indexes(),
            "recommendations": self._get_performance_recommendations()
        }}

    def _get_performance_recommendations(self) -> List[str]:
        """Get general performance recommendations"""
        recommendations = []

        stats = self.get_table_stats()
        if isinstance(stats, dict) and "access_patterns" in stats:
            access = stats["access_patterns"]

            if access["index_ratio"] < 0.95:
                recommendations.append(
                    f"Index usage ratio is {{access['index_ratio']:.2%}}. "
                    "Consider adding indexes for frequent query patterns."
                )

            if stats["rows"]["dead"] > stats["rows"]["live"] * 0.1:
                recommendations.append(
                    "High dead tuple ratio detected. Consider running VACUUM."
                )

        # Check index usage
        index_stats = self.get_index_usage()
        unused_indexes = [idx for idx in index_stats if idx.scans == 0]

        if unused_indexes:
            recommendations.append(
                f"Found {{len(unused_indexes)}} unused indexes consuming storage. "
                "Consider dropping if not needed for constraints."
            )

        return recommendations


# Utility functions
def monitor_{self.snake_name}_performance():
    """Quick performance check for {self.model_name}"""
    monitor = {self.model_name}PerformanceMonitor()

    print(f"=== {self.model_name} Performance Report ===")

    # Table stats
    stats = monitor.get_table_stats()
    if "error" not in stats:
        print(f"Rows: {{stats['rows']['live']:,}} live, {{stats['rows']['dead']:,}} dead")
        print(f"Storage: {{stats['storage']['total_size']}}")
        print(f"Index ratio: {{stats['access_patterns']['index_ratio']:.2%}}")

    # Slow queries
    slow_queries = monitor.get_slow_queries()
    if slow_queries:
        print(f"\\nTop {{len(slow_queries)}} slow queries:")
        for query in slow_queries[:5]:
            print(f"  Mean time: {query.mean_time:.2f}ms, Calls: {query.calls}")

    # Index usage
    indexes = monitor.get_index_usage()
    print(f"\\nIndex usage ({{len(indexes)}} indexes):")
    for idx in indexes[:10]:
        print(f"  {idx.index_name}: {idx.scans} scans, {idx.size_mb:.2f}MB")


if __name__ == "__main__":
    monitor_{self.snake_name}_performance()
'''

        self._write_file(f"app/db/monitoring/{self.snake_name}_performance.py", content)

    def generate_query_optimization(self):
        """Generate query optimization guidelines"""
        content = f"""# {self.model_name} Query Optimization Guide

This guide provides optimized query patterns and best practices for {self.model_name} operations.

## Index Strategy

### Available Indexes

The following indexes are created automatically for {self.model_name}:

"""

        # Document all indexes
        index_count = 0
        for field in self.model_def.fields:
            if field.type == FieldType.FOREIGN_KEY:
                index_count += 1
                content += f"- **`idx_{self.table_name}_{field.name}`** (B-tree): Foreign key index for joins\n"

            if field.unique:
                index_count += 1
                content += f"- **`idx_{self.table_name}_{field.name}_unique`** (B-tree, Unique): Unique constraint enforcement\n"

            if (
                field.type in [FieldType.STRING, FieldType.TEXT]
                and self.model_def.enable_search
            ):
                index_count += 2
                content += f"- **`idx_{self.table_name}_{field.name}_fts`** (GIN): Full-text search\n"
                content += f"- **`idx_{self.table_name}_{field.name}_lower`** (B-tree): Case-insensitive searches\n"

            if field.type in [
                FieldType.BOOLEAN,
                FieldType.ENUM,
                FieldType.DATE,
                FieldType.DATETIME,
            ]:
                index_count += 1
                content += f"- **`idx_{self.table_name}_{field.name}`** (B-tree): Filtering and sorting\n"

            if field.type == FieldType.JSON:
                index_count += 1
                content += f"- **`idx_{self.table_name}_{field.name}_gin`** (GIN): JSON key/value searches\n"

        # Composite indexes
        content += (
            f"- **`idx_{self.table_name}_created_at_id`** (B-tree): Optimized sorting\n"
        )
        index_count += 1

        if self.model_def.project_scoped:
            content += f"- **`idx_{self.table_name}_project_created`** (B-tree): Project-scoped queries\n"
            index_count += 1

        if self.model_def.owner_field:
            content += f"- **`idx_{self.table_name}_owner_created`** (B-tree): Owner-based queries\n"
            index_count += 1

        content += f"\n**Total indexes**: {index_count}\n\n"

        content += (
            """## Optimized Query Patterns

### 1. List Operations

#### ✅ Optimized: Pagination with stable sorting
```sql
SELECT * FROM """
            + self.table_name
            + """
ORDER BY created_at DESC, id DESC
LIMIT 50 OFFSET 0;
```

#### ❌ Avoid: Large offsets
```sql
-- Slow for large offsets
SELECT * FROM """
            + self.table_name
            + """
ORDER BY created_at DESC
LIMIT 50 OFFSET 10000;
```

#### ✅ Better: Cursor-based pagination
```sql
SELECT * FROM """
            + self.table_name
            + """
WHERE (created_at, id) < (?, ?)
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

### 2. Search Operations

"""
        )

        # Add search examples for text fields
        text_fields = [
            f
            for f in self.model_def.fields
            if f.type in [FieldType.STRING, FieldType.TEXT]
        ]

        if text_fields and self.model_def.enable_search:
            sample_field = text_fields[0].name
            content += f"""#### ✅ Optimized: Full-text search
```sql
SELECT * FROM {self.table_name}
WHERE to_tsvector('english', {sample_field}) @@ to_tsquery('english', 'search & terms');
```

#### ✅ Optimized: Case-insensitive pattern matching
```sql
SELECT * FROM {self.table_name}
WHERE lower({sample_field}) LIKE lower('%pattern%');
```

#### ❌ Avoid: Unindexed case-sensitive LIKE
```sql
-- Forces sequential scan
SELECT * FROM {self.table_name}
WHERE {sample_field} LIKE '%pattern%';
```

"""

        content += """### 3. Filtering Operations

"""

        # Add filtering examples
        filter_fields = [
            f
            for f in self.model_def.fields
            if f.type in [FieldType.BOOLEAN, FieldType.ENUM]
        ]

        if filter_fields:
            sample_filter = filter_fields[0].name
            content += f"""#### ✅ Optimized: Indexed filtering
```sql
SELECT * FROM {self.table_name}
WHERE {sample_filter} = 'active'
ORDER BY created_at DESC, id DESC;
```

#### ✅ Optimized: Multiple filters
```sql
SELECT * FROM {self.table_name}
WHERE {sample_filter} = 'active'
  AND created_at >= '2023-01-01'
ORDER BY created_at DESC, id DESC;
```

"""

        # Add project-scoped examples
        if self.model_def.project_scoped:
            content += f"""### 4. Project-Scoped Queries

#### ✅ Optimized: Project filtering with sorting
```sql
SELECT * FROM {self.table_name}
WHERE project_id = ?
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

#### ✅ Optimized: Project stats aggregation
```sql
SELECT
    project_id,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_count
FROM {self.table_name}
WHERE project_id IN (?, ?, ?)
GROUP BY project_id;
```

"""

        # Add owner-based examples
        if self.model_def.owner_field:
            content += f"""### 5. Owner-Based Queries

#### ✅ Optimized: User's items with sorting
```sql
SELECT * FROM {self.table_name}
WHERE {self.model_def.owner_field} = ?
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

#### ✅ Optimized: Owner statistics
```sql
SELECT
    {self.model_def.owner_field},
    COUNT(*) as item_count,
    MAX(created_at) as latest_item
FROM {self.table_name}
WHERE {self.model_def.owner_field} IN (?, ?, ?)
GROUP BY {self.model_def.owner_field};
```

"""

        # Add date/time examples
        datetime_fields = [
            f
            for f in self.model_def.fields
            if f.type in [FieldType.DATE, FieldType.DATETIME]
        ]

        if datetime_fields:
            sample_date_field = datetime_fields[0].name
            content += f"""### 6. Temporal Queries

#### ✅ Optimized: Date range filtering
```sql
SELECT * FROM {self.table_name}
WHERE {sample_date_field} >= '2023-01-01'
  AND {sample_date_field} < '2024-01-01'
ORDER BY {sample_date_field} DESC;
```

#### ✅ Optimized: Recent items
```sql
SELECT * FROM {self.table_name}
WHERE {sample_date_field} >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY {sample_date_field} DESC
LIMIT 100;
```

"""

        # Add JSON field examples
        json_fields = [f for f in self.model_def.fields if f.type == FieldType.JSON]
        if json_fields:
            sample_json_field = json_fields[0].name
            content += f"""### 7. JSON Queries

#### ✅ Optimized: JSON containment
```sql
SELECT * FROM {self.table_name}
WHERE {sample_json_field} @> '{{"key": "value"}}';
```

#### ✅ Optimized: JSON key existence
```sql
SELECT * FROM {self.table_name}
WHERE {sample_json_field} ? 'key_name';
```

#### ✅ Optimized: JSON path queries
```sql
SELECT * FROM {self.table_name}
WHERE {sample_json_field} #>> '{{path,to,value}}' = 'target_value';
```

"""

        content += f"""## Query Performance Tips

### 1. Use EXPLAIN ANALYZE
Always analyze query performance:
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM {self.table_name}
WHERE condition = ?
ORDER BY created_at DESC;
```

### 2. Avoid SELECT *
Select only needed columns:
```sql
-- ✅ Good
SELECT id, name, created_at FROM {self.table_name};

-- ❌ Avoid (unless you need all columns)
SELECT * FROM {self.table_name};
```

### 3. Use Appropriate Data Types
- Use specific types instead of TEXT when possible
- Use appropriate numeric types (INT vs BIGINT)
- Use BOOLEAN instead of VARCHAR for true/false values

### 4. Batch Operations
For bulk operations, use batch processing:
```sql
-- ✅ Good: Batch insert
INSERT INTO {self.table_name} (column1, column2, column3)
VALUES
    (?, ?, ?),
    (?, ?, ?),
    (?, ?, ?);

-- ❌ Avoid: Multiple single inserts
INSERT INTO {self.table_name} (column1, column2, column3) VALUES (?, ?, ?);
INSERT INTO {self.table_name} (column1, column2, column3) VALUES (?, ?, ?);
```

### 5. Optimize JOIN Operations

"""

        # Add JOIN examples for foreign keys
        fk_fields = [
            f for f in self.model_def.fields if f.type == FieldType.FOREIGN_KEY
        ]
        if fk_fields:
            sample_fk = fk_fields[0]
            target_table = (
                sample_fk.relationship.target_model.lower() + "s"
                if sample_fk.relationship
                else "related_table"
            )

            content += f"""#### ✅ Optimized: Use indexed foreign keys
```sql
SELECT p.*, r.name as related_name
FROM {self.table_name} p
INNER JOIN {target_table} r ON p.{sample_fk.name} = r.id
WHERE p.created_at >= ?
ORDER BY p.created_at DESC;
```

"""

        content += (
            """## Common Anti-Patterns to Avoid

### 1. ❌ Inefficient LIKE patterns
```sql
-- Prevents index usage
WHERE column LIKE '%pattern%'
-- Use full-text search instead
WHERE to_tsvector('english', column) @@ to_tsquery('english', 'pattern');
```

### 2. ❌ Functions on columns in WHERE clauses
```sql
-- Prevents index usage
WHERE UPPER(column) = 'VALUE'
-- Use expression index or store normalized values
WHERE column = 'value'  -- assuming proper case handling
```

### 3. ❌ Large IN clauses
```sql
-- Inefficient for large lists
WHERE id IN (1, 2, 3, ..., 1000)
-- Use temporary tables or EXISTS subqueries
```

### 4. ❌ Unnecessary ORDER BY in subqueries
```sql
-- Wasteful sorting
SELECT COUNT(*) FROM (
    SELECT * FROM """
            + self.table_name
            + """ ORDER BY created_at  -- Unnecessary
) subquery;
```

## Monitoring Query Performance

### Check Slow Queries
```sql
-- Enable query logging (adjust postgresql.conf)
-- log_min_duration_statement = 100

-- Or use pg_stat_statements
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%"""
            + self.table_name
            + """%'
ORDER BY mean_time DESC
LIMIT 10;
```

### Monitor Index Usage
```sql
SELECT
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE relname = """
            " + self.table_name + "
            """
ORDER BY idx_scan DESC;
```

### Check Table Statistics
```sql
SELECT
    n_live_tup,
    n_dead_tup,
    last_autovacuum,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = """
            " + self.table_name + "
            """;
```

## Application-Level Optimizations

### 1. Use Connection Pooling
- Configure appropriate pool sizes
- Use connection pooling tools like PgBouncer

### 2. Implement Caching
- Cache frequently accessed data
- Use Redis or Memcached for application-level caching
- Implement query result caching

### 3. Use Read Replicas
- Route read queries to replicas
- Keep writes on primary database

### 4. Batch Database Operations
```python
# ✅ Good: Batch operations
session.bulk_insert_mappings("""
            + self.model_name
            + """, data_list)

# ❌ Avoid: Individual operations in loops
for item in data_list:
    session.add("""
            + self.model_name
            + """(**item))
    session.commit()  # Don't commit inside loops
```

## Regular Maintenance

### 1. Update Statistics
```sql
ANALYZE """
            + self.table_name
            + """;
```

### 2. Vacuum When Needed
```sql
VACUUM ANALYZE """
            + self.table_name
            + """;
```

### 3. Monitor Index Bloat
```sql
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename = """
            " + self.table_name + "
            """;
```

### 4. Review Unused Indexes
```sql
SELECT
    indexrelname,
    idx_scan
FROM pg_stat_user_indexes
WHERE relname = """
            " + self.table_name + "
            """
    AND idx_scan = 0;
```
"""
        )

        self._write_file(f"docs/{self.snake_name}-query-optimization.md", content)

    def generate_index_maintenance(self):
        """Generate index maintenance tools and scripts"""
        content = f'''"""
Index maintenance tools for {self.model_name}

Provides utilities for index maintenance, monitoring, and optimization.
"""

from typing import Dict, List, Any, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from app.db.session import SessionLocal
from app.db.monitoring.{self.snake_name}_performance import {self.model_name}PerformanceMonitor

logger = logging.getLogger(__name__)


class {self.model_name}IndexMaintenance:
    """Index maintenance operations for {self.model_name}"""

    def __init__(self, db: Session = None):
        self.db = db or SessionLocal()
        self.table_name = "{self.table_name}"
        self.monitor = {self.model_name}PerformanceMonitor(self.db)

    def analyze_table(self) -> Dict[str, Any]:
        """Run ANALYZE on {self.model_name} table"""
        try:
            start_time = datetime.utcnow()

            # Run ANALYZE
            self.db.execute(text(f"ANALYZE {{self.table_name}}"))
            self.db.commit()

            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()

            logger.info(f"ANALYZE completed for {{self.table_name}} in {{duration:.2f}} seconds")

            return {{
                "success": True,
                "duration_seconds": duration,
                "timestamp": end_time.isoformat(),
                "operation": "ANALYZE"
            }}

        except Exception as e:
            logger.error(f"ANALYZE failed for {{self.table_name}}: {{e}}")
            return {{
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }}

    def vacuum_table(self, full: bool = False, analyze: bool = True) -> Dict[str, Any]:
        """Run VACUUM on {self.model_name} table"""
        try:
            start_time = datetime.utcnow()

            # Build VACUUM command
            vacuum_cmd = "VACUUM"
            if full:
                vacuum_cmd += " FULL"
            if analyze:
                vacuum_cmd += " ANALYZE"
            vacuum_cmd += f" {{self.table_name}}"

            # Run VACUUM
            self.db.execute(text(vacuum_cmd))
            self.db.commit()

            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()

            logger.info(f"{{vacuum_cmd}} completed in {{duration:.2f}} seconds")

            return {{
                "success": True,
                "duration_seconds": duration,
                "timestamp": end_time.isoformat(),
                "operation": vacuum_cmd,
                "full_vacuum": full
            }}

        except Exception as e:
            logger.error(f"VACUUM failed for {{self.table_name}}: {{e}}")
            return {{
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }}

    def reindex_table(self, concurrent: bool = True) -> Dict[str, Any]:
        """Rebuild all indexes for {self.model_name} table"""
        try:
            start_time = datetime.utcnow()

            # Get list of indexes
            indexes = self.db.execute(text("""
                SELECT indexname
                FROM pg_indexes
                WHERE tablename = :table_name
                    AND schemaname = 'public'
            """), {{"table_name": self.table_name}}).fetchall()

            results = []

            for index_row in indexes:
                index_name = index_row.indexname

                try:
                    # Skip primary key (cannot be reindexed concurrently)
                    if "pkey" in index_name and concurrent:
                        continue

                    reindex_cmd = f"REINDEX INDEX"
                    if concurrent:
                        reindex_cmd += " CONCURRENTLY"
                    reindex_cmd += f" {{index_name}}"

                    index_start = datetime.utcnow()
                    self.db.execute(text(reindex_cmd))
                    self.db.commit()
                    index_duration = (datetime.utcnow() - index_start).total_seconds()

                    results.append({{
                        "index": index_name,
                        "success": True,
                        "duration_seconds": index_duration
                    }})

                    logger.info(f"Reindexed {{index_name}} in {{index_duration:.2f}} seconds")

                except Exception as e:
                    results.append({{
                        "index": index_name,
                        "success": False,
                        "error": str(e)
                    }})
                    logger.error(f"Failed to reindex {{index_name}}: {{e}}")

            end_time = datetime.utcnow()
            total_duration = (end_time - start_time).total_seconds()

            return {{
                "success": True,
                "total_duration_seconds": total_duration,
                "timestamp": end_time.isoformat(),
                "concurrent": concurrent,
                "indexes_processed": len(results),
                "results": results
            }}

        except Exception as e:
            logger.error(f"REINDEX failed for {{self.table_name}}: {{e}}")
            return {{
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }}

    def check_index_bloat(self) -> List[Dict[str, Any]]:
        """Check for bloated indexes"""
        try:
            result = self.db.execute(text("""
                SELECT
                    indexrelname as index_name,
                    pg_size_pretty(pg_relation_size(indexrelid)) as size,
                    pg_relation_size(indexrelid) as size_bytes,
                    idx_scan,
                    idx_tup_read,
                    idx_tup_fetch,
                    CASE
                        WHEN idx_tup_read > 0
                        THEN round((idx_tup_fetch::numeric / idx_tup_read::numeric) * 100, 2)
                        ELSE 0
                    END as efficiency_percent
                FROM pg_stat_user_indexes
                WHERE relname = :table_name
                ORDER BY pg_relation_size(indexrelid) DESC
            """), {{"table_name": self.table_name}})

            bloat_info = []

            for row in result:
                # Simple heuristic for potential bloat
                bloat_risk = "low"
                if row.efficiency_percent < 50 and row.idx_scan > 100:
                    bloat_risk = "medium"
                if row.efficiency_percent < 25 and row.idx_scan > 1000:
                    bloat_risk = "high"

                bloat_info.append({{
                    "index_name": row.index_name,
                    "size": row.size,
                    "size_bytes": row.size_bytes,
                    "scans": row.idx_scan,
                    "efficiency_percent": row.efficiency_percent,
                    "bloat_risk": bloat_risk,
                    "recommendation": self._get_bloat_recommendation(row, bloat_risk)
                }})

            return bloat_info

        except Exception as e:
            logger.error(f"Failed to check index bloat: {{e}}")
            return []

    def _get_bloat_recommendation(self, row, bloat_risk: str) -> str:
        """Get recommendation for index bloat"""
        if bloat_risk == "high":
            return f"Consider REINDEX for {{row.index_name}} - low efficiency with high usage"
        elif bloat_risk == "medium":
            return f"Monitor {{row.index_name}} - efficiency could be improved"
        elif row.idx_scan == 0:
            return f"Consider dropping {{row.index_name}} - unused index consuming space"
        else:
            return "Index appears healthy"

    def get_maintenance_schedule(self) -> Dict[str, Any]:
        """Generate maintenance schedule recommendations"""
        stats = self.monitor.get_table_stats()

        if "error" in stats:
            return {{"error": "Could not generate schedule - table stats unavailable"}}

        schedule = {{
            "daily": [],
            "weekly": [],
            "monthly": [],
            "quarterly": []
        }}

        # Daily tasks
        if stats["access_patterns"]["index_ratio"] < 0.9:
            schedule["daily"].append("Monitor slow queries and index usage")

        # Weekly tasks
        dead_ratio = stats["rows"]["dead"] / max(stats["rows"]["live"], 1)
        if dead_ratio > 0.1:
            schedule["weekly"].append("Run VACUUM ANALYZE due to high dead tuple ratio")
        else:
            schedule["weekly"].append("Run ANALYZE to update statistics")

        # Monthly tasks
        schedule["monthly"].extend([
            "Check index bloat and efficiency",
            "Review slow query log",
            "Monitor table and index sizes"
        ])

        if stats["storage"]["total_mb"] > 1000:  # Large table
            schedule["monthly"].append("Consider partitioning for large table")

        # Quarterly tasks
        schedule["quarterly"].extend([
            "Full performance review",
            "Index usage analysis",
            "Consider new indexes based on query patterns",
            "Review and clean up unused indexes"
        ])

        return {{
            "table": self.table_name,
            "table_size_mb": stats["storage"]["total_mb"],
            "dead_tuple_ratio": dead_ratio,
            "index_ratio": stats["access_patterns"]["index_ratio"],
            "schedule": schedule,
            "next_actions": self._get_immediate_actions(stats, dead_ratio)
        }}

    def _get_immediate_actions(self, stats: Dict, dead_ratio: float) -> List[str]:
        """Get immediate maintenance actions needed"""
        actions = []

        if dead_ratio > 0.2:
            actions.append("URGENT: Run VACUUM ANALYZE - high dead tuple ratio")

        if stats["access_patterns"]["index_ratio"] < 0.5:
            actions.append("URGENT: Review query patterns - low index usage")

        if not stats["maintenance"]["last_analyze"]:
            actions.append("Run ANALYZE - no recent statistics update")

        if not actions:
            actions.append("No immediate actions required")

        return actions

    def run_maintenance_routine(self,
                               analyze: bool = True,
                               vacuum: bool = False,
                               reindex: bool = False) -> Dict[str, Any]:
        """Run complete maintenance routine"""
        results = {{
            "timestamp": datetime.utcnow().isoformat(),
            "table": self.table_name,
            "operations": []
        }}

        try:
            if analyze:
                analyze_result = self.analyze_table()
                results["operations"].append({{"analyze": analyze_result}})

            if vacuum:
                vacuum_result = self.vacuum_table()
                results["operations"].append({{"vacuum": vacuum_result}})

            if reindex:
                reindex_result = self.reindex_table()
                results["operations"].append({{"reindex": reindex_result}})

            # Get updated statistics
            results["final_stats"] = self.monitor.get_table_stats()

            logger.info(f"Maintenance routine completed for {{self.table_name}}")

        except Exception as e:
            results["error"] = str(e)
            logger.error(f"Maintenance routine failed: {{e}}")

        return results


def run_{self.snake_name}_maintenance():
    """Run maintenance routine for {self.model_name}"""
    maintenance = {self.model_name}IndexMaintenance()

    print(f"=== {self.model_name} Maintenance Report ===")

    # Check current status
    schedule = maintenance.get_maintenance_schedule()

    print(f"Table size: {{schedule.get('table_size_mb', 'unknown')}} MB")
    print(f"Dead tuple ratio: {{schedule.get('dead_tuple_ratio', 'unknown'):.2%}}")
    print(f"Index usage ratio: {{schedule.get('index_ratio', 'unknown'):.2%}}")

    print("\\nImmediate actions:")
    for action in schedule.get('next_actions', []):
        print(f"  - {{action}}")

    # Check index bloat
    bloat_info = maintenance.check_index_bloat()
    if bloat_info:
        print(f"\\nIndex health ({{len(bloat_info)}} indexes):")
        for idx in bloat_info:
            print(f"  {{idx['index_name']}}: {{idx['size']}}, {{idx['efficiency_percent']}}% efficient")
            if idx['bloat_risk'] != 'low':
                print(f"    ⚠️  {{idx['recommendation']}}")

    # Run basic maintenance
    print("\\nRunning ANALYZE...")
    result = maintenance.analyze_table()
    if result["success"]:
        print(f"  ✅ Completed in {{result['duration_seconds']:.2f}} seconds")
    else:
        print(f"  ❌ Failed: {{result['error']}}")


if __name__ == "__main__":
    run_{self.snake_name}_maintenance()
'''

        self._write_file(
            f"app/db/maintenance/{self.snake_name}_maintenance.py", content
        )

    def _write_file(self, relative_path: str, content: str):
        """Write content to file, creating directories as needed"""
        file_path = self.base_path / relative_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content)
