# Contributing to FastNext Framework

Thank you for your interest in contributing to FastNext! This document provides guidelines for contributing to the project, including how to submit pull requests, code style requirements, and development best practices.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Style Guidelines](#code-style-guidelines)
4. [Pull Request Process](#pull-request-process)
5. [Testing Requirements](#testing-requirements)
6. [Documentation Guidelines](#documentation-guidelines)
7. [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+
- PostgreSQL 12+
- Git

### Fork and Clone
1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/FastNext.git
   cd FastNext
   ```
3. Add the upstream repository as a remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/FastNext.git
   ```

## Development Setup

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your database credentials
python main.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
# Backend tests
cd backend
python test_runner.py

# Frontend tests
cd frontend
npm run test
npm run test:e2e
```

## Code Style Guidelines

### Python/Backend Standards

#### Code Formatting
- Follow PEP 8 with line length of 100 characters
- Use `black` for code formatting
- Use `isort` for import sorting
- Use type hints for all function signatures

#### Example Code Structure
```python
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import UserService
from app.core.deps import get_db

router = APIRouter()

@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    user_service: UserService = Depends()
) -> UserResponse:
    """
    Create a new user with validation and security checks.
    
    Args:
        user_data: User creation data
        db: Database session
        user_service: User service instance
        
    Returns:
        Created user information
        
    Raises:
        HTTPException: If user creation fails
    """
    try:
        user = await user_service.create_user(db, user_data)
        return UserResponse.from_orm(user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### TypeScript/Frontend Standards

#### Code Formatting
- Use Prettier for code formatting
- Use ESLint for linting
- Follow functional component patterns with hooks
- Use TypeScript strict mode

#### Example Component Structure
```tsx
import { useState, useCallback } from 'react';
import { User } from '@/shared/types';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

interface UserFormProps {
  onSubmit: (user: Partial<User>) => Promise<void>;
  initialData?: Partial<User>;
  loading?: boolean;
}

export default function UserForm({
  onSubmit,
  initialData = {},
  loading = false
}: UserFormProps): JSX.Element {
  const [formData, setFormData] = useState<Partial<User>>(initialData);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  }, [formData, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Enter username"
        value={formData.username || ''}
        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </Button>
    </form>
  );
}
```

### Database Standards
- Use snake_case for table and column names
- Include proper indexes for frequently queried columns
- Use foreign key constraints
- Include audit fields (created_at, updated_at)

### API Design Standards
- Follow RESTful conventions
- Use consistent response format
- Include proper HTTP status codes
- Implement proper error handling

## Pull Request Process

### Before Submitting
1. **Update your fork**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** following the code style guidelines

4. **Run tests** to ensure nothing is broken:
   ```bash
   # Backend
   python test_runner.py
   # Frontend
   npm run test
   npm run lint
   npm run type-check
   ```

5. **Commit your changes** with descriptive messages:
   ```bash
   git add .
   git commit -m "feat: add user profile management functionality

   - Add user profile update endpoint
   - Implement profile settings UI component
   - Add validation for profile data
   - Include tests for new functionality"
   ```

### Pull Request Guidelines

#### Title Format
Use conventional commit format:
- `feat: add new feature`
- `fix: resolve bug in user authentication`
- `docs: update API documentation`
- `style: fix code formatting`
- `refactor: improve database query performance`
- `test: add missing test coverage`
- `chore: update dependencies`

#### Description Template
```markdown
## Summary
Brief description of what this PR does and why.

## Changes Made
- [ ] Add new feature X
- [ ] Fix bug in component Y
- [ ] Update documentation for Z

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Include screenshots for UI changes.

## Breaking Changes
List any breaking changes and migration steps.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No merge conflicts
```

### Review Process
1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Verify all tests pass
4. **Documentation**: Ensure docs are updated if needed

## Testing Requirements

### Backend Testing
- Minimum 80% test coverage required
- Include unit tests for all business logic
- Add integration tests for API endpoints
- Test error scenarios and edge cases

```python
import pytest
from fastapi.testclient import TestClient

class TestUserAPI:
    def test_create_user_success(self, client: TestClient, test_db):
        response = client.post("/api/v1/users", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "SecurePass123!"
        })
        assert response.status_code == 201
        assert response.json()["username"] == "testuser"

    def test_create_user_invalid_email(self, client: TestClient):
        response = client.post("/api/v1/users", json={
            "username": "testuser",
            "email": "invalid-email",
            "password": "SecurePass123!"
        })
        assert response.status_code == 422
```

### Frontend Testing
- Use React Testing Library for component tests
- Include E2E tests for critical user flows
- Test accessibility compliance
- Test responsive design

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import UserForm from './UserForm';

describe('UserForm', () => {
  test('submits form with valid data', async () => {
    const mockSubmit = jest.fn();
    render(<UserForm onSubmit={mockSubmit} />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter username'), {
      target: { value: 'testuser' }
    });
    
    fireEvent.click(screen.getByText('Create User'));
    
    expect(mockSubmit).toHaveBeenCalledWith({
      username: 'testuser'
    });
  });
});
```

## Documentation Guidelines

### Code Documentation
- Use comprehensive docstrings for all public functions
- Include type hints and parameter descriptions
- Provide usage examples where helpful
- Document complex algorithms and business logic

### API Documentation
- Update OpenAPI/Swagger documentation for API changes
- Include request/response examples
- Document error responses and status codes
- Provide clear descriptions for all endpoints

### README Updates
- Update feature lists for new functionality
- Add setup instructions for new dependencies
- Include usage examples for new features
- Update screenshots if UI changes significantly

## Community Guidelines

### Communication
- Be respectful and constructive in all interactions
- Use clear, descriptive language in issues and PRs
- Ask questions if requirements are unclear
- Provide helpful feedback in code reviews

### Issue Reporting
When reporting bugs:
1. Use the issue template
2. Provide clear reproduction steps
3. Include environment details
4. Add screenshots for UI issues

### Feature Requests
When requesting features:
1. Explain the use case and problem being solved
2. Provide examples of desired functionality
3. Consider implementation complexity
4. Be open to alternative solutions

### Getting Help
- Check existing documentation first
- Search closed issues for similar problems
- Ask questions in GitHub Discussions
- Join community chat channels

## Scaffolding System Contributions

When contributing to the scaffolding system:

### Configuration Schema
- Follow the established JSON schema format
- Add comprehensive validation rules
- Include field type documentation
- Provide example configurations

### Generator Updates
- Test generated code thoroughly
- Ensure TypeScript and Python code align
- Follow established naming conventions
- Include comprehensive test generation

### Template Updates
- Maintain consistent code patterns
- Follow security best practices
- Include proper error handling
- Add appropriate documentation

## Release Process

### Version Management
- Follow semantic versioning (SemVer)
- Update version numbers in all relevant files
- Create detailed release notes
- Tag releases appropriately

### Deployment
- Test in staging environment first
- Run full test suite before release
- Update documentation before release
- Coordinate with maintainers for major releases

## Recognition

Contributors will be recognized in:
- Release notes for significant contributions
- README contributor section
- Annual contributor highlights

Thank you for contributing to FastNext! Your contributions help make this framework better for everyone.