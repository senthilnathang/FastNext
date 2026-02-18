# Security Policy

## Authentication

### JWT Verification
All JWT tokens (access and refresh) are now cryptographically verified in the frontend middleware using the `jose` library. This ensures that only tokens signed by the backend with the correct `SECRET_KEY` or `JWT_SECRET_KEY` are accepted.

### Secret Key Management
In production environments (`NODE_ENV=production`), the application strictly enforces the presence of a secret key.

*   **Frontend**: The middleware will fail to authenticate requests if `JWT_SECRET_KEY` or `SECRET_KEY` environment variables are not set. It will log a critical error in this case.
*   **Backend**: The application will fail to start if `SECRET_KEY` is missing or set to the default insecure value when `ENVIRONMENT=production`.

## Configuration Security

### Debug Mode
The backend application automatically forces `DEBUG=False` when `ENVIRONMENT` is set to `production`. This prevents accidental exposure of sensitive debug information (such as stack traces and environment variables) in production environments, even if `DEBUG=True` is set in the environment variables.

### Environment Variables
*   **JWT_SECRET_KEY**: (Required in Production) The secret key used to sign and verify JWT tokens. Must be kept confidential.
*   **SECRET_KEY**: (Required in Production) The main application secret key. Can be used as a fallback for `JWT_SECRET_KEY`.

## Development
For local development:
*   `frontend/.env.local` is pre-configured with a development secret key.
*   The backend auto-generates a secure secret key if one is not provided in development mode.
