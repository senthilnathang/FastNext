#!/usr/bin/env python3
"""
Script to fix print statements in production code
Converts print() to logger.error() with proper imports
"""

import re
from pathlib import Path

FILES_TO_FIX = [
    "app/api/v1/projects.py",
    "app/api/v1/workflow_templates.py",
    "app/api/v1/workflow_types.py",
    "app/api/v1/workflow_states.py",
]

def add_logging_import(content: str) -> str:
    """Add logging import if not present"""
    if "import logging" in content:
        return content

    # Find the imports section and add logging
    lines = content.split('\n')
    import_end_index = 0

    for i, line in enumerate(lines):
        if line.startswith('from ') or line.startswith('import '):
            import_end_index = i + 1
        elif import_end_index > 0 and line.strip() == '':
            break

    # Insert logging import after other imports
    lines.insert(import_end_index, 'import logging')
    return '\n'.join(lines)

def add_logger_initialization(content: str) -> str:
    """Add logger initialization if not present"""
    if "logger = logging.getLogger(__name__)" in content:
        return content

    # Find router = APIRouter() and add logger before it
    content = content.replace(
        'router = APIRouter()',
        'router = APIRouter()\nlogger = logging.getLogger(__name__)'
    )
    return content

def replace_print_with_logger(content: str, error_message_pattern: str) -> str:
    """Replace print statements with logger.error and proper exception handling"""

    # Pattern 1: print(f"Error ... : {e}") followed by return
    pattern1 = r'print\(f"(Error [^"]+): \{e\}"\)\s+return ([^)]+\))'

    def replacement1(match):
        error_msg = match.group(1)
        return_statement = match.group(2)
        return f'''logger.error(f"{error_msg}: {{e}}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="{error_msg}"
        )'''

    content = re.sub(pattern1, replacement1, content)

    return content

def fix_file(file_path: Path) -> bool:
    """Fix print statements in a single file"""
    try:
        print(f"Processing: {file_path}")

        with open(file_path, 'r') as f:
            content = f.read()

        original_content = content

        # Add imports
        content = add_logging_import(content)
        content = add_logger_initialization(content)

        # Replace print statements
        content = replace_print_with_logger(content, str(file_path))

        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
            print(f"  ✅ Fixed {file_path}")
            return True
        else:
            print(f"  ℹ️  No changes needed for {file_path}")
            return False

    except Exception as e:
        print(f"  ❌ Error fixing {file_path}: {e}")
        return False

def main():
    """Main function"""
    print("="*70)
    print("  Fixing print statements in production code")
    print("="*70)

    backend_dir = Path("/home/sen/Projects/Active/FastNext/backend")
    fixed_count = 0

    for file_rel_path in FILES_TO_FIX:
        file_path = backend_dir / file_rel_path
        if file_path.exists():
            if fix_file(file_path):
                fixed_count += 1
        else:
            print(f"  ⚠️  File not found: {file_path}")

    print("\n" + "="*70)
    print(f"  Summary: Fixed {fixed_count}/{len(FILES_TO_FIX)} files")
    print("="*70)

if __name__ == "__main__":
    main()
