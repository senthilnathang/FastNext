# CodeSecAI Coding Standards and Best Practices

## Table of Contents
1. [General Principles](#general-principles)
2. [Security Standards](#security-standards)
3. [Backend Standards (Python/FastAPI)](#backend-standards)
4. [Frontend Standards (TypeScript/React/Next.js)](#frontend-standards)
5. [Database Standards](#database-standards)
6. [API Design Standards](#api-design-standards)
7. [Testing Standards](#testing-standards)
8. [Documentation Standards](#documentation-standards)
9. [Performance Standards](#performance-standards)
10. [Code Review Standards](#code-review-standards)

## General Principles

### Code Quality
- Write self-documenting code with clear, descriptive names
- Follow DRY (Don't Repeat Yourself) principle
- Maintain SOLID principles for object-oriented design
- Use composition over inheritance where appropriate
- Keep functions small and focused on a single responsibility

### Security First
- Security considerations must be part of every design decision
- Never trust user input - validate and sanitize everything
- Implement defense in depth strategies
- Follow principle of least privilege
- Log security events comprehensively

### Maintainability
- Write code that is easy to read, understand, and modify
- Use meaningful variable and function names
- Keep cognitive complexity low
- Minimize dependencies and coupling
- Regularly refactor to improve code quality

## Security Standards

### Authentication & Authorization
```python
# ✅ Good - Secure authentication
@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: UserLogin,
    db: Session = Depends(get_db)
):
    # Rate limiting applied
    # Input validation via Pydantic
    # Comprehensive logging
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        log_security_event("LOGIN_FAILED", None, request)
        raise HTTPException(status_code=401, detail="Invalid credentials")
```

### Input Validation
```python
# ✅ Good - Comprehensive validation
class UserCreate(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    username: str = Field(..., min_length=3, max_length=50, regex=r'^[a-zA-Z0-9_-]+$')
    password: str = Field(..., min_length=8, max_length=128)
    
    @validator('password')
    def validate_password_strength(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain digit')
        return v
```

### Error Handling
```python
# ✅ Good - Secure error handling
try:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
except SQLAlchemyError as e:
    logger.error(f"Database error: {e}")
    # Don't expose internal details
    raise HTTPException(status_code=500, detail="Internal server error")
```

### Logging Security Events
```python
# ✅ Good - Security event logging
def log_security_event(
    event_type: str,
    user_id: Optional[int],
    request: Request,
    details: Dict[str, Any] = None
):
    event = SecurityLog(
        event_type=event_type,
        event_category="AUTH",
        severity="MEDIUM",
        user_id=user_id,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get('user-agent'),
        message=f"Security event: {event_type}",
        details=details or {}
    )
    db.add(event)
    db.commit()
```

## Backend Standards (Python/FastAPI)

### Project Structure
```
backend/
├── src/
│   ├── api/
│   │   ├── routes/           # API route handlers
│   │   ├── middleware/       # Custom middleware
│   │   └── dependencies/     # Dependency injection
│   ├── core/
│   │   ├── config/          # Configuration files
│   │   ├── models/          # Database and Pydantic models
│   │   └── security/        # Security utilities
│   ├── infrastructure/
│   │   ├── database/        # Database configuration
│   │   ├── external/        # External service integrations
│   │   └── storage/         # File storage
│   ├── services/            # Business logic
│   ├── utils/              # Utility functions
│   └── main.py             # Application entry point
├── tests/                  # Test files
├── migrations/             # Database migrations
└── requirements.txt        # Dependencies
```

### Code Style
```python
# ✅ Good - Following PEP 8 and type hints
from typing import List, Optional, Dict, Any
from datetime import datetime

class UserService:
    """Service for user-related operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_user(
        self, 
        user_data: UserCreate,
        created_by: Optional[int] = None
    ) -> UserResponse:
        """
        Create a new user with validation and security checks.
        
        Args:
            user_data: User creation data
            created_by: ID of user creating this user
            
        Returns:
            Created user information
            
        Raises:
            ValidationError: If user data is invalid
            ConflictError: If user already exists
        """
        # Validate unique constraints
        if self._user_exists(user_data.email, user_data.username):
            raise ConflictError("User already exists")
        
        # Create user with security defaults
        hashed_password = get_password_hash(user_data.password)
        user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password,
            is_active=True,
            is_verified=False,
            created_at=datetime.utcnow()
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return UserResponse.from_orm(user)
```

### Error Handling
```python
# ✅ Good - Comprehensive error handling
class SecurityError(Exception):
    """Base security exception."""
    pass

class RateLimitExceeded(SecurityError):
    """Rate limit exceeded."""
    pass

class SuspiciousActivity(SecurityError):
    """Suspicious activity detected."""
    pass

# Error handler
@app.exception_handler(SecurityError)
async def security_error_handler(request: Request, exc: SecurityError):
    # Log security exception
    logger.warning(f"Security error: {exc}", extra={
        "ip_address": get_client_ip(request),
        "user_agent": request.headers.get("user-agent"),
        "endpoint": request.url.path
    })
    
    return JSONResponse(
        status_code=403,
        content={"error": "Security violation", "detail": str(exc)}
    )
```

### Database Models
```python
# ✅ Good - Comprehensive database model
class User(Base, TimestampMixin):
    """User model with security features."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUIDType, unique=True, index=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Security fields
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def is_locked(self) -> bool:
        """Check if account is locked."""
        if not self.locked_until:
            return False
        return datetime.utcnow() < self.locked_until
    
    def reset_failed_attempts(self) -> None:
        """Reset failed login attempts."""
        self.failed_login_attempts = 0
        self.locked_until = None
```

## Frontend Standards (TypeScript/React/Next.js)

### Project Structure
```
frontend/
├── src/
│   ├── app/                 # Next.js app directory
│   ├── components/
│   │   ├── ui/             # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   ├── forms/          # Form components
│   │   └── layout/         # Layout components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utility libraries
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── styles/             # Styling files
├── public/                 # Static files
└── package.json           # Dependencies
```

### TypeScript Standards
```typescript
// ✅ Good - Strong typing with interfaces
interface User {
  readonly id: number;
  email: string;
  username: string;
  fullName: string;
  isActive: boolean;
  isVerified: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// ✅ Good - Generic types for API responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### React Component Standards
```tsx
// ✅ Good - Functional component with proper typing
interface PasswordStrengthProps {
  password: string;
  onStrengthChange?: (strength: number, isValid: boolean) => void;
  showRequirements?: boolean;
  minStrength?: number;
}

export default function PasswordStrength({
  password,
  onStrengthChange,
  showRequirements = true,
  minStrength = 60
}: PasswordStrengthProps): JSX.Element {
  const [strength, setStrength] = useState<number>(0);
  const [isValid, setIsValid] = useState<boolean>(false);
  
  useEffect(() => {
    const calculatedStrength = calculatePasswordStrength(password);
    const valid = calculatedStrength >= minStrength;
    
    setStrength(calculatedStrength);
    setIsValid(valid);
    onStrengthChange?.(calculatedStrength, valid);
  }, [password, minStrength, onStrengthChange]);
  
  return (
    <div className="password-strength">
      {/* Component JSX */}
    </div>
  );
}
```

### State Management
```typescript
// ✅ Good - Context with reducer pattern
interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

type AuthAction = 
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN'; payload: User };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { user: action.payload, isLoading: false, error: null };
    case 'LOGIN_FAILURE':
      return { user: null, isLoading: false, error: action.payload };
    case 'LOGOUT':
      return { user: null, isLoading: false, error: null };
    case 'REFRESH_TOKEN':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}
```

### Security in Frontend
```typescript
// ✅ Good - Secure API client
class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-Token': this.getCSRFToken()
    };
  }
  
  private getCSRFToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  }
  
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }
}
```

## Database Standards

### Naming Conventions
- Table names: `snake_case`, plural (e.g., `users`, `scan_results`)
- Column names: `snake_case` (e.g., `user_id`, `created_at`)
- Index names: `idx_<table>_<columns>` (e.g., `idx_users_email`)
- Foreign key names: `fk_<table>_<referenced_table>` (e.g., `fk_scans_users`)

### Security Standards
```sql
-- ✅ Good - Secure database design
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    
    -- Security fields
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_username_format CHECK (username ~* '^[a-zA-Z0-9_-]+$'),
    CONSTRAINT chk_failed_attempts CHECK (failed_login_attempts >= 0)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
```

### Migration Standards
```python
# ✅ Good - Alembic migration
"""Add security fields to users table

Revision ID: abc123
Revises: def456
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'abc123'
down_revision = 'def456'
branch_labels = None
depends_on = None

def upgrade():
    # Add security fields
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True))
    
    # Add constraints
    op.create_check_constraint('chk_failed_attempts', 'users', 'failed_login_attempts >= 0')
    
    # Create indexes
    op.create_index('idx_users_active', 'users', ['is_active'], postgresql_where=sa.text('is_active = true'))

def downgrade():
    # Remove in reverse order
    op.drop_index('idx_users_active')
    op.drop_constraint('chk_failed_attempts', 'users')
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')
```

## API Design Standards

### RESTful Endpoints
```
# ✅ Good - RESTful API design
GET    /api/v1/users              # List users
POST   /api/v1/users              # Create user
GET    /api/v1/users/{id}         # Get specific user
PUT    /api/v1/users/{id}         # Update user (full)
PATCH  /api/v1/users/{id}         # Update user (partial)
DELETE /api/v1/users/{id}         # Delete user

# Authentication endpoints
POST   /api/v1/auth/login         # Login
POST   /api/v1/auth/logout        # Logout
POST   /api/v1/auth/refresh       # Refresh token
GET    /api/v1/auth/me            # Current user info

# Nested resources
GET    /api/v1/users/{id}/scans   # User's scans
POST   /api/v1/users/{id}/scans   # Create scan for user
```

### Response Standards
```typescript
// ✅ Good - Consistent API responses
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    version?: string;
    timestamp: string;
  };
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    request_id: string;
  };
}

// Example responses
// Success
{
  "success": true,
  "data": { "id": 1, "username": "john_doe" },
  "meta": {
    "timestamp": "2024-01-01T12:00:00Z"
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "username": ["Username must be at least 3 characters"]
    }
  },
  "meta": {
    "timestamp": "2024-01-01T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

## Testing Standards

### Backend Testing
```python
# ✅ Good - Comprehensive test
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

class TestUserAuthentication:
    """Test user authentication endpoints."""
    
    def test_successful_login(self, client: TestClient, test_user: User):
        """Test successful user login."""
        response = client.post("/api/v1/auth/login", json={
            "username": test_user.username,
            "password": "test_password"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    def test_invalid_credentials(self, client: TestClient):
        """Test login with invalid credentials."""
        response = client.post("/api/v1/auth/login", json={
            "username": "nonexistent",
            "password": "wrong_password"
        })
        
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]
    
    def test_rate_limiting(self, client: TestClient):
        """Test rate limiting on login endpoint."""
        # Make multiple failed attempts
        for _ in range(6):  # Exceed rate limit
            client.post("/api/v1/auth/login", json={
                "username": "test",
                "password": "wrong"
            })
        
        response = client.post("/api/v1/auth/login", json={
            "username": "test",
            "password": "wrong"
        })
        
        assert response.status_code == 429  # Too Many Requests
```

### Frontend Testing
```typescript
// ✅ Good - Component testing with React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';

describe('LoginForm', () => {
  const renderLoginForm = () => {
    return render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
  };
  
  test('renders login form with all required fields', () => {
    renderLoginForm();
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
  
  test('shows validation errors for empty fields', async () => {
    renderLoginForm();
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });
  
  test('handles successful login', async () => {
    const mockLogin = jest.fn().mockResolvedValue(undefined);
    // Mock the auth context
    
    renderLoginForm();
    
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
    });
  });
});
```

## Documentation Standards

### Code Documentation
```python
# ✅ Good - Comprehensive docstring
class SecurityService:
    """
    Service for handling security-related operations.
    
    This service provides methods for authentication, authorization,
    threat detection, and security event logging.
    
    Attributes:
        db: Database session
        logger: Logger instance
        config: Security configuration
    
    Example:
        >>> service = SecurityService(db_session)
        >>> service.log_security_event("LOGIN_FAILED", user_id=123)
    """
    
    def authenticate_user(
        self, 
        username: str, 
        password: str,
        ip_address: Optional[str] = None
    ) -> Optional[User]:
        """
        Authenticate user with username and password.
        
        Performs comprehensive authentication including:
        - Password verification
        - Account status checks
        - Rate limiting validation
        - Security event logging
        
        Args:
            username: Username or email address
            password: Plain text password
            ip_address: Client IP address for logging
            
        Returns:
            User object if authentication successful, None otherwise
            
        Raises:
            AccountLockedException: If account is locked
            RateLimitExceededException: If rate limit exceeded
            
        Example:
            >>> user = service.authenticate_user("john_doe", "password123")
            >>> if user:
            ...     print(f"Welcome {user.username}")
        """
        # Implementation...
```

### API Documentation
```python
# ✅ Good - FastAPI endpoint documentation
@router.post(
    "/login",
    response_model=Token,
    status_code=200,
    summary="User Authentication",
    description="""
    **Authenticate user and obtain JWT tokens**
    
    This endpoint authenticates a user with username/password and returns:
    - `access_token`: JWT token for API authentication (expires in 1 hour)
    - `refresh_token`: Token for obtaining new access tokens (expires in 7 days)
    
    **Security Features:**
    - Rate limiting (5 attempts per minute)
    - IP address tracking and logging
    - Comprehensive audit logging
    - Account lockout protection
    
    **Usage:**
    1. Send username and password
    2. Store both tokens securely
    3. Use access_token in Authorization header: `Bearer <token>`
    4. Use refresh_token to get new access tokens before expiry
    """,
    responses={
        200: {
            "description": "Login successful",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                        "refresh_token": "refresh_eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                        "token_type": "bearer",
                        "expires_in": 3600
                    }
                }
            }
        },
        401: {"description": "Invalid credentials"},
        429: {"description": "Rate limit exceeded"}
    }
)
async def login(form_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticate user and return JWT tokens."""
    # Implementation...
```

## Code Review Standards

### Review Checklist

#### Security Review
- [ ] Input validation and sanitization
- [ ] Authentication and authorization checks
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting implementation
- [ ] Error handling (no information disclosure)
- [ ] Logging of security events
- [ ] Secrets management (no hardcoded secrets)

#### Code Quality Review
- [ ] Code follows established patterns
- [ ] Functions are small and focused
- [ ] Variable and function names are descriptive
- [ ] Comments explain "why" not "what"
- [ ] No duplicate code
- [ ] Error handling is comprehensive
- [ ] Performance considerations addressed

#### Testing Review
- [ ] Unit tests cover main functionality
- [ ] Edge cases are tested
- [ ] Security scenarios are tested
- [ ] Integration tests for critical paths
- [ ] Test coverage meets requirements (80%+)

#### Documentation Review
- [ ] Public APIs are documented
- [ ] Complex algorithms are explained
- [ ] Security considerations are noted
- [ ] Breaking changes are highlighted
- [ ] Migration guides provided if needed

### Review Comments Examples

```
# ✅ Good review comments
"Consider using parameterized queries here to prevent SQL injection"
"This function is doing too much - consider breaking it into smaller functions"
"Add input validation for this endpoint to prevent malicious data"
"Great implementation! Consider adding a comment explaining the algorithm"

# ❌ Poor review comments
"This is wrong"
"Bad code"
"Fix this"
"I don't like this approach"
```

## Performance Standards & Optimization

### Backend Performance Targets
- API response time: < 500ms for 95% of requests
- Database query time: < 100ms for simple queries
- Memory usage: < 1GB for typical workload
- CPU usage: < 70% under normal load

### Frontend Performance Targets
- First Contentful Paint: < 2s
- Largest Contentful Paint: < 3s
- Time to Interactive: < 4s
- Bundle size: < 1MB total JavaScript
- Component render time: < 16ms (60fps)

### React Performance Optimization

#### 1. Component Memoization
```tsx
// ✅ Good - Use memo for expensive components
import { memo, useMemo, useCallback } from 'react';

interface UserListProps {
  users: User[];
  onUserSelect: (user: User) => void;
  searchTerm: string;
}

const UserList = memo(({
  users,
  onUserSelect,
  searchTerm
}: UserListProps) => {
  // Memoize expensive filtering
  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // Memoize event handlers
  const handleUserClick = useCallback((user: User) => {
    onUserSelect(user);
  }, [onUserSelect]);

  return (
    <div>
      {filteredUsers.map(user => (
        <UserItem
          key={user.id}
          user={user}
          onClick={handleUserClick}
        />
      ))}
    </div>
  );
});

UserList.displayName = 'UserList';
```

#### 2. Optimized Hooks
```tsx
// ✅ Good - Custom optimization hooks
import { useOptimizedCallback, useStableCallback } from '@/shared/hooks/useOptimizedCallback';

function MyComponent({ data }: { data: ComplexData[] }) {
  // Stable callback that doesn't change unnecessarily
  const handleSubmit = useStableCallback(async (formData: FormData) => {
    await submitForm(formData);
    // Expensive operation
    await refreshData();
  }, []);

  // Optimized callback with debouncing
  const handleSearch = useOptimizedCallback(
    (searchTerm: string) => {
      performSearch(searchTerm);
    },
    [data],
    { debounce: 300 }
  );

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={(e) => handleSearch(e.target.value)} />
    </form>
  );
}
```

#### 3. Component Lazy Loading
```tsx
// ✅ Good - Lazy loading for heavy components
import { createLazyComponent, bundleStrategies } from '@/shared/components/lazy/LazyLoadComponents';

// Feature-based code splitting
const HeavyDataVisualization = bundleStrategies.byFeature(
  'charts',
  () => import('./HeavyDataVisualization')
);

// Interaction-based loading
const AdvancedEditor = bundleStrategies.onInteraction(
  () => import('./AdvancedEditor'),
  'click'
);

// Viewport-based loading
const LazyImageGallery = bundleStrategies.onVisible(
  () => import('./ImageGallery'),
  { rootMargin: '100px' }
);

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Only loads when user clicks */}
      <AdvancedEditor />
      {/* Only loads when visible */}
      <LazyImageGallery />
    </div>
  );
}
```

#### 4. Virtual Scrolling for Large Lists
```tsx
// ✅ Good - Use virtual scrolling for large datasets
import { OptimizedList } from '@/shared/components/optimized/OptimizedList';

function LargeUserList({ users }: { users: User[] }) {
  const renderUserItem = useCallback((user: User, index: number) => (
    <div className="p-4 border-b">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  ), []);

  const keyExtractor = useCallback((user: User) => user.id.toString(), []);

  return (
    <OptimizedList
      items={users}
      itemHeight={80}
      containerHeight={600}
      renderItem={renderUserItem}
      keyExtractor={keyExtractor}
    />
  );
}
```

#### 5. API Client Optimization
```tsx
// ✅ Good - Use optimized API client with caching
import { optimizedApiClient, useOptimizedApiQuery } from '@/shared/services/api/optimized-client';

function UserProfile({ userId }: { userId: number }) {
  // Automatic caching and stale-while-revalidate
  const { data: user, loading, error } = useOptimizedApiQuery(
    `/api/v1/users/${userId}`,
    {},
    {
      cache: {
        ttl: 5 * 60 * 1000, // 5 minutes
        staleWhileRevalidate: true
      },
      retry: { attempts: 3, exponentialBackoff: true },
      measurement: `user-profile-${userId}`
    }
  );

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <UserDisplay user={user} />;
}
```

### API Performance Optimization

#### 1. Response Caching
```python
# ✅ Good - API response caching
from functools import lru_cache
from fastapi import Depends
from redis import Redis

@router.get("/users", response_model=List[UserResponse])
@cache_response(ttl=300)  # Cache for 5 minutes
async def get_users(
    db: Session = Depends(get_db),
    cache: Redis = Depends(get_redis)
):
    cache_key = "users:all"
    cached_users = await cache.get(cache_key)
    
    if cached_users:
        return json.loads(cached_users)
    
    users = db.query(User).filter(User.is_active == True).all()
    user_responses = [UserResponse.from_orm(user) for user in users]
    
    # Cache the result
    await cache.setex(
        cache_key, 
        300,  # 5 minutes
        json.dumps([user.dict() for user in user_responses])
    )
    
    return user_responses
```

#### 2. Database Query Optimization
```python
# ✅ Good - Optimized database queries
from sqlalchemy.orm import joinedload, selectinload

class UserService:
    def get_users_with_roles(self, db: Session) -> List[User]:
        # Use eager loading to prevent N+1 queries
        return db.query(User)\
            .options(
                joinedload(User.roles),
                selectinload(User.projects)
            )\
            .filter(User.is_active == True)\
            .all()
    
    @lru_cache(maxsize=128)
    def get_user_permissions(self, user_id: int, db: Session) -> Set[str]:
        # Cache expensive permission calculations
        user = db.query(User)\
            .options(joinedload(User.roles).joinedload(Role.permissions))\
            .filter(User.id == user_id)\
            .first()
        
        if not user:
            return set()
        
        permissions = set()
        for role in user.roles:
            permissions.update(perm.name for perm in role.permissions)
        
        return permissions
```

#### 3. Background Task Optimization
```python
# ✅ Good - Asynchronous background tasks
from celery import Celery
from fastapi import BackgroundTasks

@router.post("/users/{user_id}/notify")
async def send_notification(
    user_id: int,
    notification: NotificationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Return immediately, process in background
    background_tasks.add_task(
        send_user_notification,
        user_id,
        notification.message,
        notification.type
    )
    
    return {"message": "Notification queued"}

async def send_user_notification(user_id: int, message: str, type: str):
    # Heavy operation runs in background
    user = await get_user(user_id)
    if user:
        await email_service.send_notification(user.email, message, type)
        await push_service.send_notification(user.device_token, message)
```

### Performance Measurement & Monitoring

#### 1. Performance Utilities
```typescript
// ✅ Good - Performance monitoring
import { performance, memoryMonitor } from '@/shared/utils/performance';

function ExpensiveComponent() {
  useEffect(() => {
    const measure = performance.measureRenderTime('ExpensiveComponent');
    measure.start();
    
    return () => {
      measure.end();
      memoryMonitor.logUsage('ExpensiveComponent');
    };
  }, []);

  const handleHeavyOperation = useCallback(async () => {
    await performance.measure('heavy-operation', async () => {
      // Expensive computation
      return await processLargeDataset();
    });
  }, []);

  return <div>...</div>;
}
```

#### 2. Bundle Analysis
```typescript
// ✅ Good - Bundle optimization
import { bundleAnalyzer } from '@/shared/utils/performance';

// Analyze component size in development
if (process.env.NODE_ENV === 'development') {
  bundleAnalyzer.analyzeComponent('WorkflowBuilder', WorkflowBuilder);
}

// Monitor memory usage
setInterval(() => {
  memoryMonitor.warnIfHigh(80); // Warn if > 80% memory usage
}, 30000);
```

### Code Splitting Best Practices

#### 1. Route-based Splitting
```tsx
// ✅ Good - Route-based code splitting
import dynamic from 'next/dynamic';

const AdminPanel = dynamic(() => import('./AdminPanel'), {
  loading: () => <AdminSkeleton />,
  ssr: false // Only load on client side
});

const WorkflowBuilder = dynamic(() => import('./WorkflowBuilder'), {
  loading: () => <WorkflowSkeleton />
});
```

#### 2. Feature-based Splitting
```tsx
// ✅ Good - Feature-based splitting
const features = {
  charts: () => import('./features/charts'),
  editor: () => import('./features/editor'),
  gallery: () => import('./features/gallery')
};

function FeatureLoader({ feature }: { feature: keyof typeof features }) {
  const FeatureComponent = useMemo(() => 
    lazy(features[feature]), [feature]
  );

  return (
    <Suspense fallback={<FeatureSkeleton />}>
      <FeatureComponent />
    </Suspense>
  );
}
```

### Performance Budget

#### Bundle Size Limits
- Main bundle: < 250KB gzipped
- Individual route chunks: < 150KB gzipped
- Third-party libraries: < 500KB total
- Individual components: < 50KB each

#### Runtime Performance
- Component render time: < 16ms (60fps)
- API response time: < 300ms average
- Time to Interactive: < 3s
- Memory usage growth: < 10MB per hour

#### Monitoring Tools
- Bundle analyzer for webpack
- Performance monitoring in development
- Lighthouse audits for production
- Core Web Vitals tracking

## Conclusion

These coding standards ensure that CodeSecAI maintains high code quality, security, and maintainability. All team members should follow these guidelines and participate in code reviews to enforce these standards.

For questions or suggestions about these standards, please reach out to the development team.