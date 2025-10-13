"""
Social Authentication Service - FastNext
Handles OAuth2 authentication with Google, GitHub, and Microsoft
"""

import json
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from authlib.integrations.base_client import OAuthError
from authlib.integrations.httpx_client import AsyncOAuth2Client

from app.core.config import settings
from app.core.logging import get_logger
from app.models.user import User
from app.models.social_account import SocialAccount
from app.services.user_service import UserService

logger = get_logger(__name__)


class SocialAuthService:
    """
    Service for handling OAuth2 social authentication.

    Supports Google, GitHub, and Microsoft OAuth2 providers.
    """

    def __init__(self, db: Session):
        self.db = db
        self.user_service = UserService(db)

    def get_oauth_client(self, provider: str) -> Optional[AsyncOAuth2Client]:
        """
        Get OAuth2 client for the specified provider.

        Args:
            provider: OAuth provider ('google', 'github', 'microsoft')

        Returns:
            OAuth2 client instance or None if provider not configured
        """
        if provider == "google":
            if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
                return None
            return AsyncOAuth2Client(
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                redirect_uri=f"{settings.API_V1_STR}/auth/oauth/google/callback",
                scope="openid email profile"
            )
        elif provider == "github":
            if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
                return None
            return AsyncOAuth2Client(
                client_id=settings.GITHUB_CLIENT_ID,
                client_secret=settings.GITHUB_CLIENT_SECRET,
                redirect_uri=f"{settings.API_V1_STR}/auth/oauth/github/callback",
                scope="user:email"
            )
        elif provider == "microsoft":
            if not settings.MICROSOFT_CLIENT_ID or not settings.MICROSOFT_CLIENT_SECRET:
                return None
            return AsyncOAuth2Client(
                client_id=settings.MICROSOFT_CLIENT_ID,
                client_secret=settings.MICROSOFT_CLIENT_SECRET,
                redirect_uri=f"{settings.API_V1_STR}/auth/oauth/microsoft/callback",
                scope="openid email profile"
            )
        return None

    def get_authorization_url(self, provider: str) -> Tuple[str, str]:
        """
        Get authorization URL for OAuth2 flow.

        Args:
            provider: OAuth provider

        Returns:
            Tuple of (authorization_url, state)
        """
        client = self.get_oauth_client(provider)
        if not client:
            raise ValueError(f"OAuth provider {provider} not configured")

        if provider == "google":
            authorization_url, state = client.create_authorization_url(
                'https://accounts.google.com/o/oauth2/auth'
            )
        elif provider == "github":
            authorization_url, state = client.create_authorization_url(
                'https://github.com/login/oauth/authorize'
            )
        elif provider == "microsoft":
            authorization_url, state = client.create_authorization_url(
                'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
            )
        else:
            raise ValueError(f"Unsupported OAuth provider: {provider}")

        return authorization_url, state

    async def exchange_code_for_token(self, provider: str, code: str, state: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token.

        Args:
            provider: OAuth provider
            code: Authorization code
            state: State parameter

        Returns:
            Token response from provider
        """
        client = self.get_oauth_client(provider)
        if not client:
            raise ValueError(f"OAuth provider {provider} not configured")

        try:
            if provider == "google":
                token_url = 'https://oauth2.googleapis.com/token'
            elif provider == "github":
                token_url = 'https://github.com/login/oauth/access_token'
            elif provider == "microsoft":
                token_url = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
            else:
                raise ValueError(f"Unsupported OAuth provider: {provider}")

            token = await client.fetch_token(token_url, code=code)
            return token
        except OAuthError as e:
            logger.error(f"OAuth token exchange failed for {provider}: {e}")
            raise

    async def get_user_info(self, provider: str, token: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get user information from OAuth provider.

        Args:
            provider: OAuth provider
            token: Access token

        Returns:
            User information from provider
        """
        client = self.get_oauth_client(provider)
        if not client:
            raise ValueError(f"OAuth provider {provider} not configured")

        client.token = token

        try:
            if provider == "google":
                # Google returns user info in ID token or via userinfo endpoint
                userinfo = await client.get('https://openidconnect.googleapis.com/v1/userinfo')
                return userinfo.json()
            elif provider == "github":
                # GitHub user info
                user_resp = await client.get('https://api.github.com/user')
                user_data = user_resp.json()

                # Get email separately
                email_resp = await client.get('https://api.github.com/user/emails')
                emails = email_resp.json()
                primary_email = next((email['email'] for email in emails if email['primary']), None)

                user_data['email'] = primary_email or user_data.get('email')
                return user_data
            elif provider == "microsoft":
                # Microsoft user info
                userinfo = await client.get('https://graph.microsoft.com/v1.0/me')
                return userinfo.json()
            else:
                raise ValueError(f"Unsupported OAuth provider: {provider}")
        except Exception as e:
            logger.error(f"Failed to get user info from {provider}: {e}")
            raise

    def find_or_create_user(self, provider: str, provider_id: str, user_info: Dict[str, Any]) -> User:
        """
        Find existing user or create new one from OAuth data.

        Args:
            provider: OAuth provider
            provider_id: Provider's user ID
            user_info: User information from provider

        Returns:
            User instance
        """
        # Check if social account already exists
        social_account = self.db.query(SocialAccount).filter(
            SocialAccount.provider == provider,
            SocialAccount.provider_id == provider_id
        ).first()

        if social_account:
            # User already exists, return it
            return social_account.user

        # Check if user with same email exists
        email = user_info.get('email')
        if email:
            existing_user = self.db.query(User).filter(User.email == email).first()
            if existing_user:
                # Link social account to existing user
                self._create_social_account(existing_user.id, provider, provider_id, user_info)
                return existing_user

        # Create new user
        username = self._generate_username(user_info)
        full_name = user_info.get('name') or user_info.get('login') or f"{user_info.get('given_name', '')} {user_info.get('family_name', '')}".strip()

        user = User(
            email=email,
            username=username,
            full_name=full_name,
            hashed_password="",  # Social auth users don't have passwords
            is_active=True,
            is_verified=True,  # Verified by OAuth provider
            created_at=datetime.utcnow()
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # Create social account
        self._create_social_account(user.id, provider, provider_id, user_info)

        logger.info(f"Created new user via {provider} OAuth: {username}")
        return user

    def _create_social_account(self, user_id: int, provider: str, provider_id: str, user_info: Dict[str, Any]) -> None:
        """
        Create social account record.

        Args:
            user_id: User ID
            provider: OAuth provider
            provider_id: Provider's user ID
            user_info: User information from provider
        """
        social_account = SocialAccount(
            user_id=user_id,
            provider=provider,
            provider_id=provider_id,
            provider_email=user_info.get('email'),
            account_data=json.dumps(user_info)
        )

        self.db.add(social_account)
        self.db.commit()

    def _generate_username(self, user_info: Dict[str, Any]) -> str:
        """
        Generate unique username from user info.

        Args:
            user_info: User information from provider

        Returns:
            Unique username
        """
        base_username = user_info.get('login') or user_info.get('preferred_username') or user_info.get('email', '').split('@')[0]

        # Ensure uniqueness
        username = base_username
        counter = 1
        while self.db.query(User).filter(User.username == username).first():
            username = f"{base_username}_{counter}"
            counter += 1

        return username