"""
Marketplace Analytics Service

Analytics tracking and reporting operations.
"""

import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any

from sqlalchemy import func, and_, or_, desc
from sqlalchemy.orm import Session

from ..models.analytics import (
    ModuleDownload,
    ModuleView,
    SearchQuery,
    DailyModuleStats,
    DailyPlatformStats,
    RevenueTransaction,
    EventLog,
)
from ..models.module import MarketplaceModule, ModuleVersion
from ..models.publisher import Publisher

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for tracking and analyzing marketplace activity."""

    def __init__(self, db: Session):
        self.db = db

    # ==========================================================================
    # Download Tracking
    # ==========================================================================

    def track_download(
        self,
        module_id: int,
        version_id: Optional[int] = None,
        user_id: Optional[int] = None,
        license_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        referrer: Optional[str] = None,
        country_code: Optional[str] = None,
        region: Optional[str] = None,
        city: Optional[str] = None,
        download_type: str = "manual",
        source: Optional[str] = None,
        fastvue_version: Optional[str] = None,
        python_version: Optional[str] = None,
    ) -> ModuleDownload:
        """Track a module download."""
        download = ModuleDownload(
            module_id=module_id,
            version_id=version_id,
            user_id=user_id,
            license_id=license_id,
            ip_address=ip_address,
            user_agent=user_agent,
            referrer=referrer,
            country_code=country_code,
            region=region,
            city=city,
            download_type=download_type,
            source=source,
            fastvue_version=fastvue_version,
            python_version=python_version,
            download_date=date.today(),
        )

        self.db.add(download)

        # Update module download count
        module = self.db.query(MarketplaceModule).get(module_id)
        if module:
            module.download_count += 1

        # Update version download count
        if version_id:
            version = self.db.query(ModuleVersion).get(version_id)
            if version:
                version.download_count += 1

        self.db.commit()
        self.db.refresh(download)

        logger.info(f"Tracked download for module {module_id}, version {version_id}")
        return download

    def get_download_stats(
        self,
        module_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Get download statistics for a module."""
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()

        query = self.db.query(ModuleDownload).filter(
            ModuleDownload.module_id == module_id,
            ModuleDownload.download_date >= start_date,
            ModuleDownload.download_date <= end_date,
        )

        total_downloads = query.count()
        unique_users = query.filter(ModuleDownload.user_id.isnot(None)).distinct(
            ModuleDownload.user_id
        ).count()

        # Downloads by date
        daily_downloads = self.db.query(
            ModuleDownload.download_date,
            func.count(ModuleDownload.id).label("count"),
        ).filter(
            ModuleDownload.module_id == module_id,
            ModuleDownload.download_date >= start_date,
            ModuleDownload.download_date <= end_date,
        ).group_by(ModuleDownload.download_date).order_by(ModuleDownload.download_date).all()

        # Downloads by country
        by_country = self.db.query(
            ModuleDownload.country_code,
            func.count(ModuleDownload.id).label("count"),
        ).filter(
            ModuleDownload.module_id == module_id,
            ModuleDownload.country_code.isnot(None),
            ModuleDownload.download_date >= start_date,
            ModuleDownload.download_date <= end_date,
        ).group_by(ModuleDownload.country_code).order_by(desc("count")).limit(10).all()

        # Downloads by source
        by_source = self.db.query(
            ModuleDownload.source,
            func.count(ModuleDownload.id).label("count"),
        ).filter(
            ModuleDownload.module_id == module_id,
            ModuleDownload.source.isnot(None),
            ModuleDownload.download_date >= start_date,
            ModuleDownload.download_date <= end_date,
        ).group_by(ModuleDownload.source).all()

        return {
            "total_downloads": total_downloads,
            "unique_users": unique_users,
            "daily_downloads": [
                {"date": str(d.download_date), "count": d.count}
                for d in daily_downloads
            ],
            "by_country": [
                {"country_code": c.country_code, "count": c.count}
                for c in by_country
            ],
            "by_source": [
                {"source": s.source or "unknown", "count": s.count}
                for s in by_source
            ],
        }

    # ==========================================================================
    # View Tracking
    # ==========================================================================

    def track_view(
        self,
        module_id: int,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        referrer: Optional[str] = None,
        country_code: Optional[str] = None,
        page_type: str = "detail",
    ) -> ModuleView:
        """Track a module page view."""
        view = ModuleView(
            module_id=module_id,
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            referrer=referrer,
            country_code=country_code,
            page_type=page_type,
            view_date=date.today(),
        )

        self.db.add(view)

        # Update module view count
        module = self.db.query(MarketplaceModule).get(module_id)
        if module:
            module.view_count += 1

        self.db.commit()
        self.db.refresh(view)
        return view

    def update_view_engagement(
        self,
        view_id: int,
        time_on_page: Optional[int] = None,
        scroll_depth: Optional[int] = None,
        clicked_install: Optional[bool] = None,
        clicked_buy: Optional[bool] = None,
        added_to_cart: Optional[bool] = None,
    ):
        """Update engagement metrics for a view."""
        view = self.db.query(ModuleView).get(view_id)
        if not view:
            return

        if time_on_page is not None:
            view.time_on_page = time_on_page
        if scroll_depth is not None:
            view.scroll_depth = scroll_depth
        if clicked_install is not None:
            view.clicked_install = clicked_install
        if clicked_buy is not None:
            view.clicked_buy = clicked_buy
        if added_to_cart is not None:
            view.added_to_cart = added_to_cart

        self.db.commit()

    def get_view_stats(
        self,
        module_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Get view statistics for a module."""
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()

        query = self.db.query(ModuleView).filter(
            ModuleView.module_id == module_id,
            ModuleView.view_date >= start_date,
            ModuleView.view_date <= end_date,
        )

        total_views = query.count()

        # Unique visitors by session or IP
        unique_sessions = query.filter(ModuleView.session_id.isnot(None)).distinct(
            ModuleView.session_id
        ).count()

        # Views by date
        daily_views = self.db.query(
            ModuleView.view_date,
            func.count(ModuleView.id).label("count"),
        ).filter(
            ModuleView.module_id == module_id,
            ModuleView.view_date >= start_date,
            ModuleView.view_date <= end_date,
        ).group_by(ModuleView.view_date).order_by(ModuleView.view_date).all()

        # Engagement metrics
        avg_time_on_page = self.db.query(
            func.avg(ModuleView.time_on_page)
        ).filter(
            ModuleView.module_id == module_id,
            ModuleView.time_on_page.isnot(None),
            ModuleView.view_date >= start_date,
            ModuleView.view_date <= end_date,
        ).scalar() or 0

        install_clicks = query.filter(ModuleView.clicked_install == True).count()
        buy_clicks = query.filter(ModuleView.clicked_buy == True).count()

        return {
            "total_views": total_views,
            "unique_visitors": unique_sessions,
            "daily_views": [
                {"date": str(v.view_date), "count": v.count}
                for v in daily_views
            ],
            "avg_time_on_page": float(avg_time_on_page),
            "install_click_rate": (install_clicks / total_views * 100) if total_views > 0 else 0,
            "buy_click_rate": (buy_clicks / total_views * 100) if total_views > 0 else 0,
        }

    # ==========================================================================
    # Search Tracking
    # ==========================================================================

    def track_search(
        self,
        query: str,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        result_count: Optional[int] = None,
        result_module_ids: Optional[List[int]] = None,
        ip_address: Optional[str] = None,
        country_code: Optional[str] = None,
    ) -> SearchQuery:
        """Track a search query."""
        search = SearchQuery(
            user_id=user_id,
            session_id=session_id,
            query=query,
            query_normalized=query.lower().strip(),
            filters=filters or {},
            result_count=result_count,
            result_module_ids=(result_module_ids or [])[:10],  # Store first 10
            ip_address=ip_address,
            country_code=country_code,
            search_date=date.today(),
        )

        self.db.add(search)
        self.db.commit()
        self.db.refresh(search)
        return search

    def track_search_click(
        self,
        search_id: int,
        module_id: int,
        position: int,
    ):
        """Track a click on a search result."""
        search = self.db.query(SearchQuery).get(search_id)
        if search:
            search.clicked_result = True
            search.clicked_module_id = module_id
            search.clicked_position = position
            self.db.commit()

    def get_popular_searches(
        self,
        limit: int = 20,
        days: int = 30,
    ) -> List[Dict[str, Any]]:
        """Get most popular search queries."""
        start_date = date.today() - timedelta(days=days)

        results = self.db.query(
            SearchQuery.query_normalized,
            func.count(SearchQuery.id).label("count"),
            func.avg(SearchQuery.result_count).label("avg_results"),
        ).filter(
            SearchQuery.search_date >= start_date,
        ).group_by(
            SearchQuery.query_normalized,
        ).order_by(desc("count")).limit(limit).all()

        return [
            {
                "query": r.query_normalized,
                "count": r.count,
                "avg_results": float(r.avg_results or 0),
            }
            for r in results
        ]

    def get_zero_result_searches(
        self,
        limit: int = 20,
        days: int = 30,
    ) -> List[Dict[str, Any]]:
        """Get searches with zero results."""
        start_date = date.today() - timedelta(days=days)

        results = self.db.query(
            SearchQuery.query_normalized,
            func.count(SearchQuery.id).label("count"),
        ).filter(
            SearchQuery.search_date >= start_date,
            SearchQuery.result_count == 0,
        ).group_by(
            SearchQuery.query_normalized,
        ).order_by(desc("count")).limit(limit).all()

        return [
            {"query": r.query_normalized, "count": r.count}
            for r in results
        ]

    # ==========================================================================
    # Daily Aggregations
    # ==========================================================================

    def aggregate_daily_module_stats(self, stat_date: Optional[date] = None):
        """Aggregate daily stats for all modules."""
        if not stat_date:
            stat_date = date.today() - timedelta(days=1)  # Yesterday

        # Get all modules with activity
        module_ids = set()

        # From downloads
        download_modules = self.db.query(ModuleDownload.module_id).filter(
            ModuleDownload.download_date == stat_date,
        ).distinct().all()
        module_ids.update(m[0] for m in download_modules)

        # From views
        view_modules = self.db.query(ModuleView.module_id).filter(
            ModuleView.view_date == stat_date,
        ).distinct().all()
        module_ids.update(m[0] for m in view_modules)

        for module_id in module_ids:
            self._aggregate_module_stats(module_id, stat_date)

        self.db.commit()
        logger.info(f"Aggregated daily stats for {len(module_ids)} modules on {stat_date}")

    def _aggregate_module_stats(self, module_id: int, stat_date: date):
        """Aggregate stats for a single module on a date."""
        # Check if already exists
        existing = self.db.query(DailyModuleStats).filter(
            DailyModuleStats.module_id == module_id,
            DailyModuleStats.stat_date == stat_date,
        ).first()

        if existing:
            stats = existing
        else:
            stats = DailyModuleStats(
                module_id=module_id,
                stat_date=stat_date,
            )
            self.db.add(stats)

        # Views
        view_query = self.db.query(ModuleView).filter(
            ModuleView.module_id == module_id,
            ModuleView.view_date == stat_date,
        )
        stats.view_count = view_query.count()
        stats.unique_visitors = view_query.filter(
            ModuleView.session_id.isnot(None)
        ).distinct(ModuleView.session_id).count()

        # Downloads
        download_query = self.db.query(ModuleDownload).filter(
            ModuleDownload.module_id == module_id,
            ModuleDownload.download_date == stat_date,
        )
        stats.download_count = download_query.count()
        stats.unique_downloaders = download_query.filter(
            ModuleDownload.user_id.isnot(None)
        ).distinct(ModuleDownload.user_id).count()

        # Conversion rates
        if stats.view_count > 0:
            stats.view_to_download_rate = int(
                (stats.download_count / stats.view_count) * 10000
            )

        # Top countries
        countries = self.db.query(
            ModuleDownload.country_code,
            func.count(ModuleDownload.id).label("count"),
        ).filter(
            ModuleDownload.module_id == module_id,
            ModuleDownload.download_date == stat_date,
            ModuleDownload.country_code.isnot(None),
        ).group_by(ModuleDownload.country_code).order_by(desc("count")).limit(5).all()

        stats.top_countries = [
            {"country_code": c.country_code, "count": c.count}
            for c in countries
        ]

    def aggregate_daily_platform_stats(self, stat_date: Optional[date] = None):
        """Aggregate daily platform-wide stats."""
        if not stat_date:
            stat_date = date.today() - timedelta(days=1)

        # Check if already exists
        existing = self.db.query(DailyPlatformStats).filter(
            DailyPlatformStats.stat_date == stat_date,
        ).first()

        if existing:
            stats = existing
        else:
            stats = DailyPlatformStats(stat_date=stat_date)
            self.db.add(stats)

        # Views
        stats.total_views = self.db.query(ModuleView).filter(
            ModuleView.view_date == stat_date,
        ).count()

        stats.unique_visitors = self.db.query(ModuleView).filter(
            ModuleView.view_date == stat_date,
            ModuleView.session_id.isnot(None),
        ).distinct(ModuleView.session_id).count()

        # Downloads
        stats.total_downloads = self.db.query(ModuleDownload).filter(
            ModuleDownload.download_date == stat_date,
        ).count()

        stats.unique_downloaders = self.db.query(ModuleDownload).filter(
            ModuleDownload.download_date == stat_date,
            ModuleDownload.user_id.isnot(None),
        ).distinct(ModuleDownload.user_id).count()

        # Searches
        stats.total_searches = self.db.query(SearchQuery).filter(
            SearchQuery.search_date == stat_date,
        ).count()

        # Module counts
        stats.total_modules = self.db.query(MarketplaceModule).count()
        stats.published_modules = self.db.query(MarketplaceModule).filter(
            MarketplaceModule.status == "published",
        ).count()

        # Top downloaded
        top_downloads = self.db.query(
            ModuleDownload.module_id,
            func.count(ModuleDownload.id).label("count"),
        ).filter(
            ModuleDownload.download_date == stat_date,
        ).group_by(ModuleDownload.module_id).order_by(desc("count")).limit(10).all()

        stats.top_downloaded = [
            {"module_id": t.module_id, "count": t.count}
            for t in top_downloads
        ]

        # Top viewed
        top_views = self.db.query(
            ModuleView.module_id,
            func.count(ModuleView.id).label("count"),
        ).filter(
            ModuleView.view_date == stat_date,
        ).group_by(ModuleView.module_id).order_by(desc("count")).limit(10).all()

        stats.top_viewed = [
            {"module_id": t.module_id, "count": t.count}
            for t in top_views
        ]

        # Top countries
        top_countries = self.db.query(
            ModuleDownload.country_code,
            func.count(ModuleDownload.id).label("count"),
        ).filter(
            ModuleDownload.download_date == stat_date,
            ModuleDownload.country_code.isnot(None),
        ).group_by(ModuleDownload.country_code).order_by(desc("count")).limit(10).all()

        stats.top_countries = [
            {"country_code": c.country_code, "count": c.count}
            for c in top_countries
        ]

        self.db.commit()
        logger.info(f"Aggregated platform stats for {stat_date}")

    # ==========================================================================
    # Publisher Analytics
    # ==========================================================================

    def get_publisher_analytics(
        self,
        publisher_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Get analytics for a publisher's modules."""
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()

        # Get publisher's modules
        module_ids = self.db.query(MarketplaceModule.id).filter(
            MarketplaceModule.publisher_id == publisher_id,
        ).all()
        module_ids = [m[0] for m in module_ids]

        if not module_ids:
            return {
                "total_downloads": 0,
                "total_views": 0,
                "modules": [],
            }

        # Total downloads
        total_downloads = self.db.query(ModuleDownload).filter(
            ModuleDownload.module_id.in_(module_ids),
            ModuleDownload.download_date >= start_date,
            ModuleDownload.download_date <= end_date,
        ).count()

        # Total views
        total_views = self.db.query(ModuleView).filter(
            ModuleView.module_id.in_(module_ids),
            ModuleView.view_date >= start_date,
            ModuleView.view_date <= end_date,
        ).count()

        # Per module stats
        module_stats = []
        for module_id in module_ids:
            module = self.db.query(MarketplaceModule).get(module_id)
            if module:
                downloads = self.db.query(ModuleDownload).filter(
                    ModuleDownload.module_id == module_id,
                    ModuleDownload.download_date >= start_date,
                    ModuleDownload.download_date <= end_date,
                ).count()

                views = self.db.query(ModuleView).filter(
                    ModuleView.module_id == module_id,
                    ModuleView.view_date >= start_date,
                    ModuleView.view_date <= end_date,
                ).count()

                module_stats.append({
                    "module_id": module_id,
                    "technical_name": module.technical_name,
                    "display_name": module.display_name,
                    "downloads": downloads,
                    "views": views,
                    "total_downloads": module.download_count,
                    "total_views": module.view_count,
                })

        return {
            "total_downloads": total_downloads,
            "total_views": total_views,
            "modules": sorted(module_stats, key=lambda x: x["downloads"], reverse=True),
        }

    # ==========================================================================
    # Event Logging
    # ==========================================================================

    def log_event(
        self,
        event_type: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        event_metadata: Optional[Dict[str, Any]] = None,
    ) -> EventLog:
        """Log a marketplace event."""
        event = EventLog(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            ip_address=ip_address,
            data=data or {},
            event_metadata=event_metadata or {},
            event_date=date.today(),
        )

        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def get_event_log(
        self,
        event_type: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[List[EventLog], int]:
        """Query event logs."""
        query = self.db.query(EventLog)

        if event_type:
            query = query.filter(EventLog.event_type == event_type)
        if entity_type:
            query = query.filter(EventLog.entity_type == entity_type)
        if entity_id:
            query = query.filter(EventLog.entity_id == entity_id)
        if user_id:
            query = query.filter(EventLog.user_id == user_id)
        if start_date:
            query = query.filter(EventLog.event_date >= start_date)
        if end_date:
            query = query.filter(EventLog.event_date <= end_date)

        total = query.count()
        events = query.order_by(EventLog.created_at.desc()).offset(skip).limit(limit).all()

        return events, total


def get_analytics_service(db: Session) -> AnalyticsService:
    """Factory function for AnalyticsService."""
    return AnalyticsService(db)
