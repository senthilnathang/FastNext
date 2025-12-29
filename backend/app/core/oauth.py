"""OAuth2 social authentication handlers"""

import httpx
from typing import Optional, Dict, Any

from app.core.config import settings


class OAuthProvider:
    """Base OAuth provider class"""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        authorize_url: str,
        token_url: str,
        userinfo_url: str,
        scopes: list,
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.authorize_url = authorize_url
        self.token_url = token_url
        self.userinfo_url = userinfo_url
        self.scopes = scopes

    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Get the authorization URL for the OAuth flow"""
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.scopes),
            "state": state,
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.authorize_url}?{query}"

    async def get_access_token(
        self, code: str, redirect_uri: str
    ) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
            )

            if response.status_code == 200:
                return response.json()
            return None

    async def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get user info from the OAuth provider"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.userinfo_url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )

            if response.status_code == 200:
                return response.json()
            return None


class GoogleOAuth(OAuthProvider):
    """Google OAuth provider"""

    def __init__(self):
        super().__init__(
            client_id=settings.GOOGLE_CLIENT_ID or "",
            client_secret=settings.GOOGLE_CLIENT_SECRET or "",
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            userinfo_url="https://www.googleapis.com/oauth2/v3/userinfo",
            scopes=["openid", "email", "profile"],
        )

    def parse_user_info(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Google user info response"""
        return {
            "provider_user_id": data.get("sub"),
            "email": data.get("email"),
            "name": data.get("name"),
            "avatar": data.get("picture"),
            "email_verified": data.get("email_verified", False),
        }


class GitHubOAuth(OAuthProvider):
    """GitHub OAuth provider"""

    def __init__(self):
        super().__init__(
            client_id=settings.GITHUB_CLIENT_ID or "",
            client_secret=settings.GITHUB_CLIENT_SECRET or "",
            authorize_url="https://github.com/login/oauth/authorize",
            token_url="https://github.com/login/oauth/access_token",
            userinfo_url="https://api.github.com/user",
            scopes=["read:user", "user:email"],
        )

    async def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get user info including email from GitHub"""
        async with httpx.AsyncClient() as client:
            # Get basic user info
            response = await client.get(
                self.userinfo_url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )

            if response.status_code != 200:
                return None

            user_data = response.json()

            # Get user emails if email not in profile
            if not user_data.get("email"):
                email_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json",
                    },
                )
                if email_response.status_code == 200:
                    emails = email_response.json()
                    # Find primary email
                    for email in emails:
                        if email.get("primary"):
                            user_data["email"] = email.get("email")
                            break

            return user_data

    def parse_user_info(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse GitHub user info response"""
        return {
            "provider_user_id": str(data.get("id")),
            "email": data.get("email"),
            "username": data.get("login"),
            "name": data.get("name"),
            "avatar": data.get("avatar_url"),
        }


class MicrosoftOAuth(OAuthProvider):
    """Microsoft OAuth provider"""

    def __init__(self):
        super().__init__(
            client_id=settings.MICROSOFT_CLIENT_ID or "",
            client_secret=settings.MICROSOFT_CLIENT_SECRET or "",
            authorize_url="https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            token_url="https://login.microsoftonline.com/common/oauth2/v2.0/token",
            userinfo_url="https://graph.microsoft.com/v1.0/me",
            scopes=["openid", "email", "profile", "User.Read"],
        )

    def parse_user_info(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Microsoft user info response"""
        return {
            "provider_user_id": data.get("id"),
            "email": data.get("mail") or data.get("userPrincipalName"),
            "name": data.get("displayName"),
            "username": data.get("userPrincipalName"),
        }


# OAuth provider registry
oauth_providers = {
    "google": GoogleOAuth,
    "github": GitHubOAuth,
    "microsoft": MicrosoftOAuth,
}


def get_oauth_provider(provider_name: str) -> Optional[OAuthProvider]:
    """Get OAuth provider instance by name"""
    provider_class = oauth_providers.get(provider_name.lower())
    if provider_class:
        return provider_class()
    return None
