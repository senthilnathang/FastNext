"""
Router Override System

Allows modules to override or extend existing API endpoints.
Inspired by Odoo's method overriding and Django's URL patterns.
"""

import logging
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Tuple

from fastapi import APIRouter, FastAPI
from fastapi.routing import APIRoute

from .registry import ModuleRegistry

logger = logging.getLogger(__name__)


class RouterOverrider:
    """
    Handles API endpoint overrides and extensions.

    Allows modules to:
    - Replace existing endpoint handlers
    - Wrap existing handlers with pre/post processing
    - Add new routes to existing routers
    """

    def __init__(self, registry: Optional[ModuleRegistry] = None):
        self.registry = registry or ModuleRegistry.get_registry()

        # Original routes: path+method -> original handler
        self._original_routes: Dict[str, Callable] = {}

        # Overrides: path+method -> new handler
        self._overrides: Dict[str, Callable] = {}

        # Wrappers: path+method -> list of wrapper functions
        self._wrappers: Dict[str, List[Callable]] = {}

        # Route extensions: router_name -> list of routes to add
        self._route_extensions: Dict[str, List[Tuple[str, str, Callable, Dict]]] = {}

    def _make_route_key(self, path: str, method: str) -> str:
        """Create a unique key for a route."""
        return f"{method.upper()}:{path}"

    def register_override(
        self,
        path: str,
        method: str,
        handler: Callable,
        module_name: Optional[str] = None,
    ) -> None:
        """
        Register an override for an existing route.

        The new handler completely replaces the original.

        Args:
            path: Route path (e.g., '/api/v1/users/')
            method: HTTP method (GET, POST, etc.)
            handler: New handler function
            module_name: Name of the module providing this override
        """
        key = self._make_route_key(path, method)

        if key in self._overrides:
            logger.warning(
                f"Route {method} {path} already has an override, replacing"
            )

        self._overrides[key] = handler
        logger.info(
            f"Registered override for {method} {path} "
            f"from module {module_name or 'unknown'}"
        )

    def register_wrapper(
        self,
        path: str,
        method: str,
        wrapper: Callable,
        module_name: Optional[str] = None,
    ) -> None:
        """
        Register a wrapper for an existing route.

        The wrapper receives the original handler and can call it.
        Multiple wrappers are applied in order of registration.

        Args:
            path: Route path
            method: HTTP method
            wrapper: Wrapper function that receives (original_handler, *args, **kwargs)
            module_name: Name of the module providing this wrapper
        """
        key = self._make_route_key(path, method)

        if key not in self._wrappers:
            self._wrappers[key] = []

        self._wrappers[key].append(wrapper)
        logger.debug(
            f"Registered wrapper for {method} {path} "
            f"from module {module_name or 'unknown'}"
        )

    def register_route_extension(
        self,
        router_name: str,
        path: str,
        method: str,
        handler: Callable,
        **route_kwargs: Any,
    ) -> None:
        """
        Register a new route to be added to an existing router.

        Args:
            router_name: Name of the router to extend (e.g., 'users', 'auth')
            path: New route path
            method: HTTP method
            handler: Handler function
            **route_kwargs: Additional arguments for APIRouter.add_api_route()
        """
        if router_name not in self._route_extensions:
            self._route_extensions[router_name] = []

        self._route_extensions[router_name].append(
            (path, method, handler, route_kwargs)
        )
        logger.debug(f"Registered route extension: {method} {path} for {router_name}")

    def apply_overrides(self, app: FastAPI) -> int:
        """
        Apply all registered overrides to the FastAPI application.

        Args:
            app: FastAPI application instance

        Returns:
            Number of overrides applied
        """
        applied = 0

        for route in app.routes:
            if not isinstance(route, APIRoute):
                continue

            for method in route.methods:
                key = self._make_route_key(route.path, method)

                # Store original handler
                if key not in self._original_routes:
                    self._original_routes[key] = route.endpoint

                # Apply override if registered
                if key in self._overrides:
                    route.endpoint = self._overrides[key]
                    route.dependant = None  # Force dependency recalculation
                    applied += 1
                    logger.info(f"Applied override for {method} {route.path}")

                # Apply wrappers if registered
                elif key in self._wrappers:
                    original = route.endpoint
                    wrapped = self._apply_wrappers(original, self._wrappers[key])
                    route.endpoint = wrapped
                    route.dependant = None
                    applied += 1
                    logger.info(
                        f"Applied {len(self._wrappers[key])} wrappers "
                        f"for {method} {route.path}"
                    )

        return applied

    def apply_route_extensions(
        self,
        routers: Dict[str, APIRouter],
    ) -> int:
        """
        Apply route extensions to routers.

        Args:
            routers: Dictionary of router_name -> APIRouter

        Returns:
            Number of routes added
        """
        added = 0

        for router_name, extensions in self._route_extensions.items():
            if router_name not in routers:
                logger.warning(
                    f"Router '{router_name}' not found, skipping extensions"
                )
                continue

            router = routers[router_name]

            for path, method, handler, kwargs in extensions:
                router.add_api_route(
                    path,
                    handler,
                    methods=[method],
                    **kwargs,
                )
                added += 1
                logger.debug(f"Added route {method} {path} to {router_name}")

        return added

    def _apply_wrappers(
        self,
        original: Callable,
        wrappers: List[Callable],
    ) -> Callable:
        """
        Apply multiple wrappers to an original function.

        Wrappers are applied in order, with each wrapping the previous result.
        """
        current = original

        for wrapper in wrappers:
            # Create closure to capture current value
            def make_wrapped(prev: Callable, wrap: Callable) -> Callable:
                @wraps(prev)
                async def wrapped(*args: Any, **kwargs: Any) -> Any:
                    return await wrap(prev, *args, **kwargs)
                return wrapped

            current = make_wrapped(current, wrapper)

        return current

    def get_original_handler(self, path: str, method: str) -> Optional[Callable]:
        """
        Get the original handler for a route.

        Useful when you need to call the original in a wrapper/override.
        """
        key = self._make_route_key(path, method)
        return self._original_routes.get(key)

    def restore_original(self, app: FastAPI, path: str, method: str) -> bool:
        """
        Restore the original handler for a route.

        Returns True if successful, False if original not found.
        """
        key = self._make_route_key(path, method)

        if key not in self._original_routes:
            return False

        for route in app.routes:
            if isinstance(route, APIRoute) and route.path == path:
                if method in route.methods:
                    route.endpoint = self._original_routes[key]
                    route.dependant = None

                    # Remove from overrides
                    self._overrides.pop(key, None)
                    self._wrappers.pop(key, None)

                    return True

        return False

    def clear_overrides(self) -> None:
        """Clear all registered overrides (mainly for testing)."""
        self._overrides.clear()
        self._wrappers.clear()
        self._route_extensions.clear()
        # Keep original routes for potential restoration


# Global instance
_overrider: Optional[RouterOverrider] = None


def get_router_overrider() -> RouterOverrider:
    """Get the global RouterOverrider instance."""
    global _overrider
    if _overrider is None:
        _overrider = RouterOverrider()
    return _overrider


def override_route(path: str, method: str = "GET"):
    """
    Decorator to register a route override.

    Usage:
        @override_route('/api/v1/users/', 'GET')
        async def custom_list_users(...):
            # Custom implementation
            pass
    """
    def decorator(func: Callable) -> Callable:
        overrider = get_router_overrider()
        overrider.register_override(path, method, func)
        return func

    return decorator


def wrap_route(path: str, method: str = "GET"):
    """
    Decorator to register a route wrapper.

    Usage:
        @wrap_route('/api/v1/users/', 'POST')
        async def log_user_creation(original, *args, **kwargs):
            logger.info("Creating user...")
            result = await original(*args, **kwargs)
            logger.info("User created!")
            return result
    """
    def decorator(func: Callable) -> Callable:
        overrider = get_router_overrider()
        overrider.register_wrapper(path, method, func)
        return func

    return decorator


def extend_router(router_name: str, path: str, method: str = "GET", **kwargs: Any):
    """
    Decorator to add a new route to an existing router.

    Usage:
        @extend_router('users', '/me/preferences', 'GET')
        async def get_user_preferences(...):
            pass
    """
    def decorator(func: Callable) -> Callable:
        overrider = get_router_overrider()
        overrider.register_route_extension(router_name, path, method, func, **kwargs)
        return func

    return decorator
