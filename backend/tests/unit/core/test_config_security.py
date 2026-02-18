import os
import pytest
from unittest.mock import patch, MagicMock

# Import the Settings class directly to test initialization
from app.core.config import Settings, _DEFAULT_SECRET_KEY

class TestConfigSecurity:
    """Tests for security enforcement in configuration"""

    def test_debug_forced_false_in_production(self):
        """Test that DEBUG is forced to False when ENVIRONMENT is production"""
        with patch.dict(os.environ, {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "secure-production-key-must-be-long-enough",
            "DEBUG": "True"  # Trying to enable debug in production
        }):
            settings = Settings()
            assert settings.DEBUG is False
            assert settings.ENVIRONMENT == "production"

    def test_debug_allowed_true_in_development(self):
        """Test that DEBUG can be True in development"""
        with patch.dict(os.environ, {
            "ENVIRONMENT": "development",
            "SECRET_KEY": "dev-key",
            "DEBUG": "True"
        }):
            settings = Settings()
            assert settings.DEBUG is True
            assert settings.ENVIRONMENT == "development"

    def test_secret_key_validation_production_default(self):
        """Test that default secret key raises error in production"""
        with patch.dict(os.environ, {
            "ENVIRONMENT": "production",
            "SECRET_KEY": _DEFAULT_SECRET_KEY
        }):
            with pytest.raises(ValueError, match="SECRET_KEY must be set to a secure value"):
                Settings()

    def test_secret_key_validation_production_missing(self):
        """Test that missing secret key raises error in production"""
        # Ensure SECRET_KEY is not in environment
        env = os.environ.copy()
        if "SECRET_KEY" in env:
            del env["SECRET_KEY"]

        with patch.dict(os.environ, env, clear=True):
            with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
                with pytest.raises(ValueError, match="SECRET_KEY must be set to a secure value"):
                    Settings()

    def test_secret_key_auto_generated_in_development(self):
        """Test that secret key is auto-generated if missing in development"""
        # Ensure SECRET_KEY is not in environment
        env = os.environ.copy()
        if "SECRET_KEY" in env:
            del env["SECRET_KEY"]

        with patch.dict(os.environ, env, clear=True):
            with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
                settings = Settings()
                assert settings.SECRET_KEY is not None
                assert len(settings.SECRET_KEY) >= 32
                assert settings.SECRET_KEY != _DEFAULT_SECRET_KEY
