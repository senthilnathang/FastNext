# Knowledge Base: Troubleshooting Login Issues

## Problem: "Invalid Credentials" Error

### Symptoms
- Users receive "Invalid username or password" error
- Account appears to be locked or disabled
- Password reset emails are not being received

### Solutions

#### Check Account Status
1. **Verify Account Activation**: Ensure the user has clicked the email verification link sent during registration
2. **Check Account Lockout**: Review security logs for failed login attempts that may have triggered account lockout
3. **Password Requirements**: Confirm the password meets complexity requirements (8+ characters, mixed case, numbers, symbols)

#### Reset Password Process
```bash
# If using the admin panel
1. Navigate to User Management
2. Find the affected user
3. Click "Reset Password"
4. Provide temporary password
5. Force password change on next login
```

#### Email Delivery Issues
- **Check Spam Folder**: Password reset emails may be filtered as spam
- **Verify Email Address**: Ensure the email address is correctly entered
- **SMTP Configuration**: Check email service configuration in system settings

#### Two-Factor Authentication Problems
- **Backup Codes**: Use backup codes if 2FA device is unavailable
- **Time Sync**: Ensure device time is synchronized
- **App Issues**: Try regenerating QR code or using different authenticator app

### Prevention
- Implement password policies
- Enable account lockout after failed attempts
- Regular security training for users

---

## Problem: "Account Suspended" Message

### Symptoms
- Users see "Your account has been suspended" on login
- Access denied to all system features
- Admin intervention required

### Solutions

#### Administrative Actions
1. **Review Security Logs**: Check for suspicious activity or policy violations
2. **Verify Compliance**: Ensure account meets organizational policies
3. **Contact User**: Confirm legitimacy of account access requests

#### Reactivation Process
```bash
# Admin steps to reactivate
1. Access Admin Panel > User Management
2. Locate suspended user
3. Review suspension reason
4. Click "Reactivate Account" if appropriate
5. Reset password if security concern
6. Notify user of reactivation
```

#### Common Causes
- **Security Violations**: Multiple failed login attempts
- **Policy Breaches**: Violation of acceptable use policies
- **Inactive Accounts**: Automatic suspension after prolonged inactivity
- **Billing Issues**: Account suspension due to payment problems

### Prevention
- Clear acceptable use policies
- Regular account audits
- Automated notifications before suspension
- Grace periods for reactivation

---

## Problem: Session Timeout Issues

### Symptoms
- Users are unexpectedly logged out
- "Session expired" messages
- Need to re-authenticate frequently

### Solutions

#### Session Configuration
```yaml
# Adjust session settings in config
session:
  timeout: 480  # minutes
  idle_timeout: 60  # minutes
  remember_me: true
  sliding_expiration: true
```

#### Browser Issues
- **Clear Cookies**: Remove FastNext cookies and cache
- **Incognito Mode**: Test in private browsing mode
- **Multiple Tabs**: Close other tabs if experiencing conflicts

#### Network Issues
- **VPN Problems**: Check VPN session timeouts
- **Proxy Settings**: Verify proxy configuration
- **Firewall Rules**: Ensure WebSocket connections are allowed

### Prevention
- Configure appropriate session timeouts
- Implement sliding session expiration
- Provide session renewal warnings
- Use secure cookie settings

---

## Problem: SSO Integration Issues

### Symptoms
- SSO login fails with various errors
- Redirect loops during authentication
- "Invalid SAML response" messages

### Solutions

#### SAML Configuration
```xml
<!-- Verify IdP metadata -->
<EntityDescriptor entityID="https://idp.example.com">
  <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                        Location="https://idp.example.com/sso"/>
  </IDPSSODescriptor>
</EntityDescriptor>
```

#### Certificate Issues
- **Expired Certificates**: Check certificate validity dates
- **Certificate Mismatch**: Verify certificate matches configured thumbprint
- **Chain Issues**: Ensure full certificate chain is present

#### Time Synchronization
- **Clock Skew**: Ensure server and IdP clocks are synchronized
- **Timezone Issues**: Verify timezone settings match

### Prevention
- Regular certificate renewal monitoring
- Automated testing of SSO flows
- Detailed logging of authentication attempts
- Backup authentication methods

---

## Related Articles
- [Password Reset Issues](password-reset-troubleshooting.md)
- [Two-Factor Authentication Setup](2fa-setup-guide.md)
- [Account Security Best Practices](account-security-best-practices.md)
- [SSO Configuration Guide](sso-configuration-guide.md)

## Support
If these solutions don't resolve your issue, please:
1. Collect relevant log entries
2. Note exact error messages
3. Include browser and OS information
4. Contact support with the above information

---

*Last updated: December 2024*
*Applies to: FastNext Framework v1.5*