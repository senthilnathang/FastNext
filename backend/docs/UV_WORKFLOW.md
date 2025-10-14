# 🚀 UV - Simplified Dependency Management

UV is now configured for faster, more reliable dependency management in the FastNext backend.

## 🏃‍♂️ Quick Start

```bash
# 1. Setup (one-time)
./uv-setup.sh

# 2. Activate environment
source .venv/bin/activate
# OR
source activate-uv.sh

# 3. Start development
python main.py
```

## 📦 Package Management

### Installing Packages

```bash
# Install a single package
uv pip install requests

# Install with version constraints
uv pip install "fastapi>=0.100.0,<1.0.0"

# Install development dependencies
uv pip install pytest black isort

# Install from requirements
uv pip install -r requirements.txt

# Install from lock file (exact versions)
uv pip install -r uv.lock
```

### Managing Dependencies

```bash
# List installed packages
uv pip list

# Show dependency tree
uv pip show <package>

# Freeze current environment
uv pip freeze > uv.lock

# Uninstall packages
uv pip uninstall <package>

# Upgrade packages
uv pip install --upgrade <package>
```

## 🛠️ Development Workflow

### Environment Management

```bash
# Create new environment
uv venv --python 3.12

# Create environment with specific name
uv venv .venv-dev --python 3.12

# Remove environment
rm -rf .venv
```

### Daily Development

```bash
# 1. Activate environment
source .venv/bin/activate

# 2. Install new dependencies as needed
uv pip install <new-package>

# 3. Update lock file
uv pip freeze > uv.lock

# 4. Run development server
python main.py

# 5. Run tests
pytest

# 6. Format code
black .
isort .
```

## ⚡ Performance Benefits

### Speed Comparisons
- **pip**: ~45 seconds for initial install
- **uv**: ~8 seconds for initial install (5x faster)

### Resolution Benefits
- Faster dependency resolution
- Better conflict detection
- More reliable installations
- Parallel downloads

## 🔧 Configuration

### Environment Variables

Create `.env` file:
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/db

# Redis
REDIS_URL=redis://localhost:6379

# Development
DEBUG=true
```

### UV Configuration

UV reads from `pyproject.toml`:
```toml
[project]
dependencies = [
    "fastapi>=0.104.0,<1.0.0",
    "uvicorn[standard]>=0.24.0,<1.0.0",
    # ... other dependencies
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "black>=23.0.0",
    # ... dev dependencies
]
```

## 📚 Common Commands

### Project Setup
```bash
# Clone and setup
git clone <repo>
cd backend
./uv-setup.sh
source .venv/bin/activate
```

### Adding New Dependencies
```bash
# Add to pyproject.toml, then:
uv pip install <package>
uv pip freeze > uv.lock
git add pyproject.toml uv.lock
```

### Updating Dependencies
```bash
# Update all
uv pip install --upgrade-package

# Update specific package
uv pip install --upgrade <package>
uv pip freeze > uv.lock
```

### CI/CD Integration
```bash
# In CI scripts
uv venv
source .venv/bin/activate
uv pip install -r uv.lock
pytest
```

## 🐛 Troubleshooting

### Common Issues

1. **Package not found**
   ```bash
   # Try upgrading UV
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Virtual environment issues**
   ```bash
   # Remove and recreate
   rm -rf .venv
   uv venv --python 3.12
   ```

3. **Import errors**
   ```bash
   # Ensure environment is activated
   source .venv/bin/activate
   # Reinstall dependencies
   uv pip install -r uv.lock
   ```

### Performance Tips

- Use `uv.lock` for production deployments
- Keep `pyproject.toml` for dependency ranges
- Use `uv pip freeze` to generate exact versions
- Cache `uv.lock` in CI/CD for faster builds

## 🔄 Migration from pip

### From requirements.txt
```bash
# Install existing requirements
uv pip install -r requirements.txt

# Generate new lock file
uv pip freeze > uv.lock

# Optional: Update pyproject.toml
```

### From Poetry/Pipenv
```bash
# Export dependencies
poetry export -f requirements.txt --output requirements.txt
# OR
pipenv requirements > requirements.txt

# Install with UV
uv pip install -r requirements.txt
uv pip freeze > uv.lock
```

## 🚀 Next Steps

1. **Team Adoption**: Share this guide with team members
2. **CI/CD Update**: Update build scripts to use UV
3. **Documentation**: Update project README with UV instructions
4. **Monitoring**: Track installation times and dependency issues

---

**Resources:**
- [UV Documentation](https://docs.astral.sh/uv/)
- [UV GitHub](https://github.com/astral-sh/uv)
- [FastNext Backend Docs](./docs/)
