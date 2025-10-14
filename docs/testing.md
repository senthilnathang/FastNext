# FastNext Framework - Testing Guide

This guide covers the comprehensive testing strategy for the FastNext Framework, including backend unit/integration tests with pytest and frontend end-to-end tests with Playwright.

## Testing Architecture

The FastNext Framework implements a multi-layered testing approach:

### Backend Testing (pytest)
- **Unit Tests**: Test individual functions, classes, and modules
- **Integration Tests**: Test component interactions and database operations
- **API Tests**: Test HTTP endpoints and request/response handling
- **Authentication Tests**: Test security and auth flows
- **Workflow Tests**: Test workflow engine and related functionality
- **CRUD Tests**: Test Create, Read, Update, Delete operations

### Frontend Testing (Playwright)
- **End-to-End Tests**: Test complete user workflows
- **API Tests**: Test backend API endpoints directly
- **Authentication Tests**: Test login/logout flows
- **Admin Tests**: Test admin panel functionality
- **Workflow Tests**: Test workflow builder and management
- **Responsive Tests**: Test mobile and tablet layouts

## Backend Testing Setup

### Prerequisites
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Dependencies
- **pytest**: Test framework
- **pytest-asyncio**: Async test support
- **pytest-cov**: Coverage reporting
- **pytest-mock**: Mocking utilities
- **httpx**: HTTP client for API testing
- **factory-boy**: Test data factories
- **freezegun**: Time mocking

### Configuration
Tests are configured via `pytest.ini`:
- Test discovery patterns
- Coverage requirements (80% minimum)
- Test markers for categorization
- Async test mode

### Running Backend Tests

#### Using Test Runner Script
```bash
# Run all tests with coverage
python test_runner.py

# Run specific test types
python test_runner.py --type unit
python test_runner.py --type integration
python test_runner.py --type api
python test_runner.py --type auth
python test_runner.py --type workflow
python test_runner.py --type crud

# Run fast tests only (exclude slow tests)
python test_runner.py --type fast

# Run with parallel execution
python test_runner.py --parallel

# Run without coverage
python test_runner.py --no-coverage

# Generate comprehensive report
python test_runner.py --report

# Clean test artifacts
python test_runner.py --clean
```

#### Using pytest Directly
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test files
pytest tests/unit/test_models.py
pytest tests/api/test_auth_api.py

# Run by markers
pytest -m unit
pytest -m "api and not slow"

# Run parallel tests
pytest -n auto

# Verbose output
pytest -v

# Stop on first failure
pytest -x
```

### Test Structure

```
backend/tests/
├── conftest.py              # Test configuration and fixtures
├── unit/                    # Unit tests
│   ├── test_models.py       # Model tests
│   ├── test_services.py     # Service layer tests
│   └── test_utils.py        # Utility function tests
├── integration/             # Integration tests
│   ├── test_database.py     # Database integration
│   └── test_workflow_engine.py
├── api/                     # API endpoint tests
│   ├── test_auth_api.py     # Authentication endpoints
│   ├── test_users_api.py    # User management endpoints
│   ├── test_roles_api.py    # Role management endpoints
│   └── test_workflow_api.py # Workflow endpoints
├── auth/                    # Authentication tests
├── workflow/                # Workflow-specific tests
├── crud/                    # CRUD operation tests
└── utils/                   # Test utilities
```

### Test Fixtures

Common fixtures available in `conftest.py`:
- `db`: Fresh database session for each test
- `client`: FastAPI test client
- `admin_user`: Admin user instance
- `regular_user`: Regular user instance
- `admin_headers`: Headers with admin JWT token
- `user_headers`: Headers with regular user JWT token
- `test_data_factory`: Factory for generating test data

### Example Backend Test

```python
import pytest
from fastapi import status

def test_create_user_success(client, admin_headers, test_data_factory):
    """Test successful user creation."""
    user_data = test_data_factory.create_user_data()

    response = client.post("/api/v1/users", headers=admin_headers, json=user_data)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == user_data["email"]
    assert "password" not in data

@pytest.mark.auth
def test_login_invalid_credentials(client):
    """Test login with invalid credentials."""
    response = client.post("/api/v1/auth/login", json={
        "username": "invalid@test.com",
        "password": "wrongpassword"
    })

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

## Frontend E2E Testing Setup

### Prerequisites
```bash
cd frontend
npm install
npx playwright install
```

### Dependencies
- **@playwright/test**: Playwright testing framework
- **TypeScript**: For type-safe test scripts

### Configuration
E2E tests are configured via `playwright.config.ts`:
- Multiple browser support (Chrome, Firefox, Safari)
- Mobile device testing
- Parallel test execution
- Screenshot/video on failure
- Authentication state management

### Running E2E Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/auth/login.test.ts

# Run tests for specific browser
npx playwright test --project=chromium

# Run admin tests only
npx playwright test tests/e2e/admin/

# Generate test report
npx playwright show-report
```

### Test Structure

```
frontend/tests/e2e/
├── global-setup.ts          # Global test setup
├── global-teardown.ts       # Global test cleanup
├── auth.setup.ts           # Authentication setup
├── auth/                   # Authentication tests
│   └── login.test.ts       # Login/logout tests
├── admin/                  # Admin panel tests
│   ├── users.test.ts       # User management tests
│   ├── roles.test.ts       # Role management tests
│   └── permissions.test.ts # Permission management tests
├── workflow/               # Workflow tests
│   └── workflow-management.test.ts
├── api/                    # Direct API tests
│   └── health-check.test.ts
├── utils/                  # Test utilities
│   └── test-helpers.ts     # Helper functions
└── .auth/                  # Stored authentication states
    ├── user.json          # Regular user session
    └── admin.json         # Admin user session
```

### Test Utilities

The `TestHelpers` class provides common functionality:
- Authentication helpers
- Form filling utilities
- Element interaction helpers
- Screenshot capture
- Responsive design testing
- API mocking capabilities

### Example E2E Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test('should create new user', async ({ page }) => {
    await page.goto('/admin/users');

    // Open create dialog
    await page.click('button:has-text("Create User")');

    // Fill form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('text=User created successfully')).toBeVisible();
  });
});
```

## Test Coverage

### Coverage Goals
- **Backend**: Minimum 80% code coverage
- **Critical Paths**: 100% coverage for authentication and security
- **API Endpoints**: 100% coverage for all public endpoints
- **Database Models**: 100% coverage for model validation

### Coverage Reports
- **HTML Report**: `backend/htmlcov/index.html`
- **Terminal Report**: Displayed after test runs
- **XML Report**: `backend/coverage.xml` (for CI/CD)

### Viewing Coverage
```bash
# Backend coverage
cd backend
python test_runner.py --report
open htmlcov/index.html

# Frontend coverage (if using Jest)
cd frontend
npm run test:coverage
open coverage/lcov-report/index.html
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          python test_runner.py --report
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm install
          npx playwright install
      - name: Run E2E tests
        run: |
          cd frontend
          npm run test:e2e
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## Test Data Management

### Backend Test Data
- **Fixtures**: Predefined test data in `conftest.py`
- **Factories**: Dynamic test data generation using `factory-boy`
- **Database**: Fresh SQLite database for each test
- **Cleanup**: Automatic cleanup after each test

### Frontend Test Data
- **Mock API**: Mock API responses for isolated testing
- **Test Users**: Pre-configured test users with different roles
- **Authentication**: Stored authentication states for different user types

## Best Practices

### Backend Testing
1. **Isolation**: Each test should be independent
2. **AAA Pattern**: Arrange, Act, Assert
3. **Descriptive Names**: Test names should describe what they test
4. **Edge Cases**: Test both happy path and error conditions
5. **Mock External Services**: Use mocks for external dependencies

### Frontend Testing
1. **User-Centric**: Test from user's perspective
2. **Page Object Model**: Use page objects for complex interactions
3. **Stable Selectors**: Use data-testid attributes when possible
4. **Wait Strategies**: Use appropriate wait strategies for dynamic content
5. **Cross-Browser**: Test on multiple browsers and devices

## Debugging Tests

### Backend Debugging
```bash
# Run single test with verbose output
pytest -v -s tests/unit/test_models.py::TestUserModel::test_create_user

# Use pdb debugger
pytest --pdb tests/unit/test_models.py

# Run with logging
pytest --log-cli-level=DEBUG
```

### Frontend Debugging
```bash
# Debug mode (opens DevTools)
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Record test actions
npx playwright codegen localhost:3000
```

## Performance Testing

### Backend Performance
- **Load Testing**: Use pytest-benchmark for performance tests
- **Database Performance**: Test query performance
- **API Response Times**: Monitor endpoint response times

### Frontend Performance
- **Page Load Times**: Monitor page load performance
- **Interactive Elements**: Test response times for user interactions
- **Memory Usage**: Monitor memory leaks in long-running tests

## Security Testing

### Backend Security
- **Authentication**: Test all auth flows and edge cases
- **Authorization**: Verify role-based access control
- **Input Validation**: Test with malicious inputs
- **SQL Injection**: Test database query safety

### Frontend Security
- **XSS Protection**: Test input sanitization
- **CSRF Protection**: Verify CSRF token handling
- **Session Management**: Test session timeout and renewal
- **Sensitive Data**: Ensure no sensitive data in client

## Maintenance

### Regular Tasks
1. **Update Dependencies**: Keep testing libraries up to date
2. **Review Coverage**: Maintain target coverage levels
3. **Performance Monitoring**: Track test execution times
4. **Flaky Test Detection**: Identify and fix unstable tests
5. **Test Documentation**: Keep test documentation current

### Metrics to Monitor
- Test execution time
- Test coverage percentage
- Test failure rates
- Number of flaky tests
- Coverage trends over time

## Troubleshooting

### Common Issues

#### Backend Tests
- **Database Connection**: Ensure test database is accessible
- **Missing Dependencies**: Check all requirements are installed
- **Port Conflicts**: Ensure test ports are available
- **Fixture Scope**: Check fixture scope for shared state issues

#### Frontend Tests
- **Browser Installation**: Ensure browsers are installed (`npx playwright install`)
- **Server Not Running**: Verify development server is accessible
- **Timeout Issues**: Increase timeout for slow operations
- **Authentication State**: Check if auth state files are valid

### Getting Help
1. Check test logs for error details
2. Review test configuration files
3. Verify environment setup
4. Check for conflicting processes
5. Consult framework documentation

This comprehensive testing setup ensures the FastNext Framework maintains high quality, reliability, and security standards throughout development and deployment.
