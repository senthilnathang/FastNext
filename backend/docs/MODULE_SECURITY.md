# Module System Security Guide

This document outlines the security measures implemented in the FastVue module system and best practices for secure module development.

## Security Measures

### 1. Input Validation

#### Module Name Validation

Module names are validated against a strict pattern:
- Must start with a letter (a-z, A-Z)
- Can only contain letters, numbers, and underscores
- Maximum 255 characters
- Reserved names are blocked (`__pycache__`, `__init__`, etc.)

```python
# Valid: my_module, SalesModule, module123
# Invalid: 123module, my-module, ../malicious
```

#### Manifest Parsing

Manifests are parsed using `ast.literal_eval()`, which:
- Only allows Python literals (dicts, lists, strings, numbers, bools, None)
- Does NOT execute arbitrary code
- Rejects function calls, imports, or expressions

```python
# Safe: {'name': 'Module', 'version': '1.0.0'}
# Rejected: {'hook': __import__('os').system('rm -rf /')}
```

### 2. ZIP Upload Security

#### Path Traversal Prevention

All ZIP file operations include path validation:
- Entries starting with `/` are rejected (absolute paths)
- Entries containing `..` are rejected (parent directory traversal)
- Windows-style absolute paths (e.g., `C:\`) are rejected
- Each extracted file is verified to be within the target directory

```python
# Rejected entries:
# - ../../../etc/passwd
# - /etc/passwd
# - C:\Windows\System32
```

#### ZIP Bomb Protection

Limits are enforced to prevent denial-of-service:
- Maximum 1000 files per ZIP
- Maximum 100MB uncompressed size
- Maximum 50MB upload size

#### Content Validation

- File extension must be `.zip`
- Content-type must be `application/zip`, `application/x-zip-compressed`, or `application/octet-stream`
- Filename cannot contain path separators

### 3. Authentication & Authorization

- All module management endpoints require authentication
- Install, uninstall, upgrade, and upload require superuser privileges
- The `base` module cannot be uninstalled

### 4. Thread Safety

- Registry uses double-checked locking for thread-safe singleton
- Manifest caching uses `threading.RLock`
- Discovery state is protected by locks

## Security Configuration

### Recommended Settings

```env
# Limit addon paths to trusted directories
ADDONS_PATHS=/opt/trusted_modules

# Enable debug logging for security events
LOG_LEVEL=INFO
```

### File Permissions

```bash
# Module directories should be owned by the app user
chown -R appuser:appuser /opt/FastVue/backend/modules

# Restrict write access
chmod 755 /opt/FastVue/backend/modules
```

## Security Considerations

### What the Module System Does NOT Protect Against

1. **Malicious Module Code**: Once installed, a module's Python code runs with full privileges. Only install modules from trusted sources.

2. **SQL Injection in Module Code**: Modules must use parameterized queries. The framework doesn't sandbox database access.

3. **Dependency Vulnerabilities**: External Python packages declared in `external_dependencies` are installed without security scanning.

### Recommendations

1. **Code Review**: Review all module code before installation, especially:
   - Models and database operations
   - API endpoints and authentication
   - File system operations
   - External API calls

2. **Use Version Control**: Keep modules in version control to track changes.

3. **Test in Staging**: Always test new modules in a staging environment first.

4. **Monitor Logs**: Watch for security-related log entries:
   ```
   grep -i "security\|traversal\|invalid\|rejected" logs/*.log
   ```

5. **Regular Audits**: Periodically audit installed modules and their permissions.

## Reporting Security Issues

If you discover a security vulnerability in the module system, please report it to security@fastvue.dev. Do not disclose security issues publicly until they have been addressed.

## Security Changelog

### v1.1.0 (2024-12)

- Added path traversal protection in ZIP extraction
- Added ZIP bomb protection (file count and size limits)
- Added module name validation
- Added manifest size limits
- Added content-type validation for uploads
- Added thread-safe caching
- Added input sanitization in `InstalledModule.from_manifest()`
