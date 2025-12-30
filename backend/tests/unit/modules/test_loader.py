"""
Module Loader Tests

Tests for the module discovery, loading, and security features.
"""

import tempfile
import zipfile
from pathlib import Path

import pytest

from app.core.modules import (
    ModuleLoader,
    ModuleRegistry,
    InvalidModuleError,
    ModuleNotFoundError,
)


class TestModuleLoader:
    """Tests for ModuleLoader class."""

    @pytest.fixture
    def temp_addon_path(self, tmp_path):
        """Create a temporary addon path with a test module."""
        # Create test module
        test_module = tmp_path / "test_module"
        test_module.mkdir()

        # Create __init__.py
        (test_module / "__init__.py").write_text('"""Test module."""\n')

        # Create __manifest__.py
        manifest = {
            "name": "Test Module",
            "version": "1.0.0",
            "summary": "A test module",
            "depends": [],
        }
        (test_module / "__manifest__.py").write_text(str(manifest))

        return tmp_path

    @pytest.fixture
    def loader(self, temp_addon_path):
        """Create a module loader with test addon path."""
        registry = ModuleRegistry()
        registry.reset()  # Ensure clean state
        return ModuleLoader([temp_addon_path], registry)

    def test_discover_modules(self, loader, temp_addon_path):
        """Test module discovery."""
        discovered = loader.discover_modules()

        assert "test_module" in discovered
        assert len(discovered) == 1

    def test_discover_modules_caching(self, loader):
        """Test that discovery results are cached."""
        # First call
        result1 = loader.discover_modules()

        # Second call should use cache
        result2 = loader.discover_modules()

        assert result1 == result2

    def test_discover_modules_force_refresh(self, loader):
        """Test force refresh bypasses cache."""
        loader.discover_modules()

        # Force refresh
        result = loader.discover_modules(force=True)

        assert "test_module" in result

    def test_load_manifest(self, loader, temp_addon_path):
        """Test manifest loading."""
        loader.discover_modules()
        module_path = loader.get_module_path("test_module")

        manifest = loader.load_manifest(module_path)

        assert manifest["name"] == "Test Module"
        assert manifest["version"] == "1.0.0"

    def test_load_manifest_caching(self, loader, temp_addon_path):
        """Test that manifests are cached."""
        loader.discover_modules()
        module_path = loader.get_module_path("test_module")

        # First call
        manifest1 = loader.load_manifest(module_path)

        # Second call should use cache
        manifest2 = loader.load_manifest(module_path)

        assert manifest1 == manifest2

    def test_invalid_module_name_rejected(self, tmp_path):
        """Test that invalid module names are rejected."""
        # Create module with invalid name
        invalid_module = tmp_path / "123_invalid"
        invalid_module.mkdir()
        (invalid_module / "__init__.py").write_text("")
        (invalid_module / "__manifest__.py").write_text("{'name': 'Invalid'}")

        registry = ModuleRegistry()
        registry.reset()
        loader = ModuleLoader([tmp_path], registry)

        discovered = loader.discover_modules()

        # Invalid name should be skipped
        assert "123_invalid" not in discovered

    def test_validate_module_name(self, loader):
        """Test module name validation."""
        # Valid names
        assert loader._validate_module_name("base") is True
        assert loader._validate_module_name("my_module") is True
        assert loader._validate_module_name("Module123") is True

        # Invalid names
        assert loader._validate_module_name("123module") is False
        assert loader._validate_module_name("my-module") is False
        assert loader._validate_module_name("") is False
        assert loader._validate_module_name("__pycache__") is False


class TestZipValidation:
    """Tests for ZIP file validation."""

    @pytest.fixture
    def loader(self, tmp_path):
        """Create a module loader."""
        registry = ModuleRegistry()
        registry.reset()
        return ModuleLoader([tmp_path], registry)

    def test_valid_zip_structure(self, loader, tmp_path):
        """Test valid ZIP structure validation."""
        # Create a valid module ZIP
        zip_path = tmp_path / "valid_module.zip"

        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.writestr("valid_module/__init__.py", "")
            zf.writestr("valid_module/__manifest__.py", "{'name': 'Valid'}")

        assert loader.validate_zip_structure(zip_path) is True

    def test_invalid_zip_no_manifest(self, loader, tmp_path):
        """Test ZIP without manifest is rejected."""
        zip_path = tmp_path / "no_manifest.zip"

        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.writestr("module/__init__.py", "")

        assert loader.validate_zip_structure(zip_path) is False

    def test_invalid_zip_no_init(self, loader, tmp_path):
        """Test ZIP without __init__.py is rejected."""
        zip_path = tmp_path / "no_init.zip"

        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.writestr("module/__manifest__.py", "{'name': 'Test'}")

        assert loader.validate_zip_structure(zip_path) is False

    def test_path_traversal_rejected(self, loader, tmp_path):
        """Test that path traversal attempts are rejected."""
        zip_path = tmp_path / "traversal.zip"

        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.writestr("module/__init__.py", "")
            zf.writestr("module/__manifest__.py", "{'name': 'Test'}")
            zf.writestr("../etc/passwd", "malicious")

        assert loader.validate_zip_structure(zip_path) is False

    def test_absolute_path_rejected(self, loader, tmp_path):
        """Test that absolute paths are rejected."""
        zip_path = tmp_path / "absolute.zip"

        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.writestr("module/__init__.py", "")
            zf.writestr("module/__manifest__.py", "{'name': 'Test'}")
            zf.writestr("/etc/passwd", "malicious")

        assert loader.validate_zip_structure(zip_path) is False


class TestModuleInstallation:
    """Tests for module installation from ZIP."""

    @pytest.fixture
    def loader(self, tmp_path):
        """Create a module loader with target directory."""
        target = tmp_path / "addons"
        target.mkdir()

        registry = ModuleRegistry()
        registry.reset()
        return ModuleLoader([target], registry)

    def test_install_from_valid_zip(self, loader, tmp_path):
        """Test installing from a valid ZIP file."""
        zip_path = tmp_path / "new_module.zip"

        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.writestr("new_module/__init__.py", '"""New module."""\n')
            zf.writestr("new_module/__manifest__.py", "{'name': 'New Module', 'version': '1.0.0', 'depends': []}")

        module_name = loader.install_from_zip(zip_path)

        assert module_name == "new_module"
        assert "new_module" in loader._discovered

    def test_install_invalid_module_name(self, loader, tmp_path):
        """Test that installing a module with invalid name fails."""
        zip_path = tmp_path / "bad_module.zip"

        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.writestr("123bad/__init__.py", "")
            zf.writestr("123bad/__manifest__.py", "{'name': 'Bad'}")

        with pytest.raises(InvalidModuleError):
            loader.install_from_zip(zip_path)


class TestManifestValidation:
    """Tests for manifest validation."""

    @pytest.fixture
    def loader(self, tmp_path):
        """Create a module loader."""
        registry = ModuleRegistry()
        registry.reset()
        return ModuleLoader([tmp_path], registry)

    def test_large_manifest_rejected(self, loader, tmp_path):
        """Test that large manifests are rejected."""
        test_module = tmp_path / "large_manifest"
        test_module.mkdir()
        (test_module / "__init__.py").write_text("")

        # Create a very large manifest (>100KB)
        large_content = "{'name': 'Test', 'description': '" + "x" * 150000 + "'}"
        (test_module / "__manifest__.py").write_text(large_content)

        with pytest.raises(InvalidModuleError) as exc_info:
            loader.load_manifest(test_module, use_cache=False)

        assert "too large" in str(exc_info.value)

    def test_invalid_manifest_syntax(self, loader, tmp_path):
        """Test that invalid manifest syntax is rejected."""
        test_module = tmp_path / "bad_syntax"
        test_module.mkdir()
        (test_module / "__init__.py").write_text("")
        (test_module / "__manifest__.py").write_text("{'name': 'Test'")  # Missing closing brace

        with pytest.raises(InvalidModuleError):
            loader.load_manifest(test_module, use_cache=False)


class TestRegistry:
    """Tests for ModuleRegistry."""

    def test_singleton_pattern(self):
        """Test that registry is a singleton."""
        reg1 = ModuleRegistry.get_registry()
        reg2 = ModuleRegistry.get_registry()

        assert reg1 is reg2

    def test_register_and_get_module(self):
        """Test module registration and retrieval."""
        from app.core.modules.manifest import ManifestSchema

        registry = ModuleRegistry()
        registry.reset()

        manifest = ManifestSchema(name="Test", version="1.0.0")
        path = Path("/fake/path")

        module_info = registry.register("test", manifest, path)

        assert registry.get("test") is module_info
        assert module_info.name == "test"
        assert module_info.manifest.name == "Test"

    def test_resolve_load_order(self):
        """Test dependency resolution for load order."""
        from app.core.modules.manifest import ManifestSchema

        registry = ModuleRegistry()
        registry.reset()

        # Register modules with dependencies
        base = ManifestSchema(name="Base", version="1.0.0", depends=[])
        auth = ManifestSchema(name="Auth", version="1.0.0", depends=["base"])
        app = ManifestSchema(name="App", version="1.0.0", depends=["base", "auth"])

        registry.register("base", base, Path("/base"))
        registry.register("auth", auth, Path("/auth"))
        registry.register("app", app, Path("/app"))

        load_order = registry.resolve_load_order()

        # base should come before auth and app
        assert load_order.index("base") < load_order.index("auth")
        assert load_order.index("auth") < load_order.index("app")
