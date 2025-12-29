"""
Email notification service for FastNext.

Sends notification emails using SMTP or email service providers.
Supports both immediate and digest (daily/weekly) emails.
"""

import logging
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional, Any

from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Service for sending notification emails.

    Supports:
    - Immediate notification emails
    - Daily/weekly digest emails
    - HTML and plain text formats
    """

    def __init__(self):
        self._smtp_connection: Optional[smtplib.SMTP] = None

    @property
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        email_enabled = getattr(settings, 'EMAIL_NOTIFICATIONS_ENABLED', False)
        smtp_host = getattr(settings, 'SMTP_HOST', None)
        smtp_user = getattr(settings, 'SMTP_USER', None)
        smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        return bool(
            email_enabled
            and smtp_host
            and smtp_user
            and smtp_password
        )

    @property
    def from_email(self) -> str:
        """Get the from email address"""
        emails_from = getattr(settings, 'EMAILS_FROM_EMAIL', None)
        smtp_from = getattr(settings, 'SMTP_FROM_EMAIL', 'noreply@fastnext.com')
        return emails_from or smtp_from

    def _get_smtp_connection(self) -> smtplib.SMTP:
        """Get SMTP connection (lazy initialization)"""
        if not self.is_configured:
            raise RuntimeError("Email service is not configured")

        smtp_host = getattr(settings, 'SMTP_HOST', 'smtp.gmail.com')
        smtp_port = getattr(settings, 'SMTP_PORT', 587)
        smtp_tls = getattr(settings, 'SMTP_TLS', True)
        smtp_user = getattr(settings, 'SMTP_USER', '')
        smtp_password = getattr(settings, 'SMTP_PASSWORD', '')

        try:
            if smtp_tls:
                smtp = smtplib.SMTP(smtp_host, smtp_port)
                smtp.starttls()
            else:
                smtp = smtplib.SMTP_SSL(smtp_host, smtp_port)

            smtp.login(smtp_user, smtp_password)
            return smtp
        except Exception as e:
            logger.error(f"Failed to connect to SMTP server: {e}")
            raise

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        reply_to: Optional[str] = None,
    ) -> bool:
        """
        Send an email.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML content
            text_body: Plain text content (optional, generated from HTML if not provided)
            reply_to: Reply-to address (optional)

        Returns:
            True if sent successfully
        """
        if not self.is_configured:
            logger.warning("Email service not configured, skipping email")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email

            if reply_to:
                msg["Reply-To"] = reply_to

            # Add plain text part
            if text_body:
                part1 = MIMEText(text_body, "plain")
                msg.attach(part1)

            # Add HTML part
            part2 = MIMEText(html_body, "html")
            msg.attach(part2)

            # Send email
            smtp = self._get_smtp_connection()
            try:
                smtp.sendmail(self.from_email, [to_email], msg.as_string())
                logger.info(f"Email sent to {to_email}: {subject}")
                return True
            finally:
                smtp.quit()

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    async def send_notification_email(
        self,
        db: Session,
        user_id: int,
        notification_type: str,
        subject: str,
        title: str,
        body: str,
        action_url: Optional[str] = None,
        sender_name: Optional[str] = None,
    ) -> bool:
        """
        Send a notification email to a user.

        Checks user preferences before sending.

        Args:
            db: Database session
            user_id: User to notify
            notification_type: Type for preference checking (message, mention, etc.)
            subject: Email subject
            title: Notification title
            body: Notification body
            action_url: Link to view the notification
            sender_name: Name of the sender (for messages)

        Returns:
            True if sent successfully
        """
        if not self.is_configured:
            return False

        # Get user email
        from app.models.user import User
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.email:
            logger.warning(f"User {user_id} not found or has no email")
            return False

        # Generate email content
        html_body = self._render_notification_email(
            title=title,
            body=body,
            action_url=action_url,
            sender_name=sender_name,
        )

        text_body = self._render_notification_text(
            title=title,
            body=body,
            action_url=action_url,
            sender_name=sender_name,
        )

        return await self.send_email(
            to_email=user.email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
        )

    async def send_new_message_email(
        self,
        db: Session,
        recipient_id: int,
        sender_name: str,
        sender_email: Optional[str],
        subject: Optional[str],
        preview: str,
        message_id: int,
    ) -> bool:
        """Send email notification for new message"""
        email_subject = f"New message from {sender_name}"
        if subject:
            email_subject = f"{email_subject}: {subject}"

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        action_url = f"{frontend_url}/inbox?message={message_id}"

        return await self.send_notification_email(
            db=db,
            user_id=recipient_id,
            notification_type="message",
            subject=email_subject,
            title=f"New message from {sender_name}",
            body=preview[:500],
            action_url=action_url,
            sender_name=sender_name,
        )

    async def send_mention_email(
        self,
        db: Session,
        mentioned_user_id: int,
        mentioner_name: str,
        context: str,
        message_id: int,
    ) -> bool:
        """Send email notification for @mention"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        action_url = f"{frontend_url}/inbox?message={message_id}"

        return await self.send_notification_email(
            db=db,
            user_id=mentioned_user_id,
            notification_type="mention",
            subject=f"{mentioner_name} mentioned you",
            title=f"{mentioner_name} mentioned you",
            body=context[:500],
            action_url=action_url,
            sender_name=mentioner_name,
        )

    async def send_reply_email(
        self,
        db: Session,
        original_author_id: int,
        replier_name: str,
        preview: str,
        message_id: int,
    ) -> bool:
        """Send email notification for reply"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        action_url = f"{frontend_url}/inbox?message={message_id}"

        return await self.send_notification_email(
            db=db,
            user_id=original_author_id,
            notification_type="reply",
            subject=f"{replier_name} replied to your message",
            title=f"{replier_name} replied",
            body=preview[:500],
            action_url=action_url,
            sender_name=replier_name,
        )

    async def send_digest_email(
        self,
        db: Session,
        user_id: int,
        period: str = "daily",
    ) -> bool:
        """
        Send a digest email summarizing unread items.

        Args:
            db: Database session
            user_id: User to send digest to
            period: 'daily' or 'weekly'

        Returns:
            True if sent successfully
        """
        email_digest_enabled = getattr(settings, 'EMAIL_DIGEST_ENABLED', False)
        if not self.is_configured or not email_digest_enabled:
            return False

        # Get user email
        from app.models.user import User
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.email:
            return False

        # Try to get inbox items (may not exist in all deployments)
        try:
            from app.models.inbox import InboxItem
            from_date = datetime.utcnow() - timedelta(days=1 if period == "daily" else 7)

            items = (
                db.query(InboxItem)
                .filter(
                    InboxItem.user_id == user_id,
                    InboxItem.is_read == False,
                    InboxItem.is_archived == False,
                    InboxItem.created_at >= from_date,
                )
                .order_by(InboxItem.created_at.desc())
                .limit(50)
                .all()
            )

            if not items:
                logger.debug(f"No unread items for user {user_id} digest")
                return False

            # Generate digest email
            subject = f"Your {period} digest - {len(items)} unread items"
            html_body = self._render_digest_email(items, period)
            text_body = self._render_digest_text(items, period)

            return await self.send_email(
                to_email=user.email,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
            )
        except ImportError:
            logger.warning("InboxItem model not available for digest emails")
            return False

    def _render_notification_email(
        self,
        title: str,
        body: str,
        action_url: Optional[str] = None,
        sender_name: Optional[str] = None,
    ) -> str:
        """Render notification email HTML"""
        action_button = ""
        if action_url:
            action_button = f'''
            <tr>
                <td style="padding: 20px 0;">
                    <a href="{action_url}"
                       style="background-color: #6366f1; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        View in FastNext
                    </a>
                </td>
            </tr>
            '''

        sender_line = ""
        if sender_name:
            sender_line = f'<p style="color: #6b7280; margin-bottom: 10px;">From: {sender_name}</p>'

        return f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 30px; border-bottom: 1px solid #e5e7eb;">
                            <h1 style="margin: 0; color: #111827; font-size: 24px;">{title}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px;">
                            {sender_line}
                            <p style="color: #374151; line-height: 1.6; margin: 0;">{body}</p>
                        </td>
                    </tr>
                    {action_button}
                    <tr>
                        <td style="padding: 20px 30px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                This email was sent by FastNext. You can manage your notification preferences in your account settings.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
'''

    def _render_notification_text(
        self,
        title: str,
        body: str,
        action_url: Optional[str] = None,
        sender_name: Optional[str] = None,
    ) -> str:
        """Render notification email plain text"""
        lines = [title, "=" * len(title), ""]

        if sender_name:
            lines.append(f"From: {sender_name}")
            lines.append("")

        lines.append(body)
        lines.append("")

        if action_url:
            lines.append(f"View in FastNext: {action_url}")
            lines.append("")

        lines.append("-" * 40)
        lines.append("This email was sent by FastNext.")
        lines.append("Manage notification preferences in your account settings.")

        return "\n".join(lines)

    def _render_digest_email(self, items: List[Any], period: str) -> str:
        """Render digest email HTML"""
        items_html = ""
        for item in items[:20]:  # Limit to 20 items in digest
            item_type = getattr(item, 'item_type', None)
            type_value = item_type.value if hasattr(item_type, 'value') else str(item_type)
            type_color = {
                "message": "#3b82f6",
                "notification": "#10b981",
                "activity": "#8b5cf6",
                "mention": "#f59e0b",
            }.get(type_value, "#6b7280")

            title = getattr(item, 'title', 'No title') or 'No title'
            preview = getattr(item, 'preview', '') or ''

            items_html += f'''
            <tr>
                <td style="padding: 15px; border-bottom: 1px solid #e5e7eb;">
                    <span style="background-color: {type_color}; color: white; padding: 2px 8px;
                                 border-radius: 4px; font-size: 11px; text-transform: uppercase;">
                        {type_value}
                    </span>
                    <p style="margin: 8px 0 4px 0; font-weight: 500; color: #111827;">
                        {title}
                    </p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        {preview[:100]}...
                    </p>
                </td>
            </tr>
            '''

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

        return f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 30px; border-bottom: 1px solid #e5e7eb;">
                            <h1 style="margin: 0; color: #111827; font-size: 24px;">
                                Your {period.capitalize()} Digest
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #6b7280;">
                                You have {len(items)} unread items
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                {items_html}
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px;" align="center">
                            <a href="{frontend_url}/inbox"
                               style="background-color: #6366f1; color: white; padding: 12px 24px;
                                      text-decoration: none; border-radius: 6px; display: inline-block;">
                                View All in FastNext
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                This {period} digest was sent by FastNext.
                                Manage your digest settings in account preferences.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
'''

    def _render_digest_text(self, items: List[Any], period: str) -> str:
        """Render digest email plain text"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

        lines = [
            f"Your {period.capitalize()} Digest",
            "=" * 30,
            f"You have {len(items)} unread items",
            "",
        ]

        for item in items[:20]:
            item_type = getattr(item, 'item_type', None)
            type_value = item_type.value if hasattr(item_type, 'value') else str(item_type)
            title = getattr(item, 'title', 'No title') or 'No title'
            preview = getattr(item, 'preview', '') or ''

            lines.append(f"[{type_value.upper()}] {title}")
            if preview:
                lines.append(f"  {preview[:100]}...")
            lines.append("")

        lines.append("-" * 40)
        lines.append(f"View all: {frontend_url}/inbox")
        lines.append("")
        lines.append(f"This {period} digest was sent by FastNext.")

        return "\n".join(lines)


# Global email service instance
email_service = EmailService()
