#!/usr/bin/env python3
"""
Backend-God: Quick Validate Script
===================================
Validates that a backend fix output meets the minimum safety standards
before running a full grading pass.

Usage:
    python scripts/quick_validate.py <path-to-modified-file>

Checks performed:
1. module.exports is present (for JS files)
2. No getPricingConfig() inside a loop
3. global.io.emit is guarded with if (global.io)
4. try/catch present around async functions
5. No obvious unchecked db usage

Exit codes:
    0 = All checks passed
    1 = One or more checks failed
"""

import re
import sys
import json
from pathlib import Path


def read_file(path: str) -> str:
    try:
        return Path(path).read_text(encoding='utf-8')
    except Exception as e:
        print(f"ERROR: Could not read file: {e}")
        sys.exit(1)


def check_module_exports(content: str, filename: str) -> dict:
    """Check that module.exports is present in JS files."""
    if not filename.endswith('.js'):
        return {"check": "module_exports_present", "passed": True, "evidence": "Not a JS file — skipped"}
    
    has_exports = 'module.exports' in content
    return {
        "check": "module_exports_present",
        "passed": has_exports,
        "evidence": "module.exports found in file" if has_exports else "WARNING: module.exports not found — exports may be broken"
    }


def check_pricing_not_in_loop(content: str) -> dict:
    """Check getPricingConfig() is not called inside a for/forEach/map loop."""
    # Look for getPricingConfig inside loop patterns
    loop_patterns = [
        r'for\s*\(.*\)\s*\{[^}]*getPricingConfig',
        r'forEach\s*\([^)]*=>[^}]*getPricingConfig',
        r'\.map\s*\([^)]*=>[^}]*getPricingConfig',
    ]
    
    found_in_loop = any(re.search(p, content, re.DOTALL) for p in loop_patterns)
    return {
        "check": "no_pricing_config_in_loop",
        "passed": not found_in_loop,
        "evidence": "getPricingConfig() not found inside loops" if not found_in_loop 
                   else "WARNING: getPricingConfig() appears to be called inside a loop — this causes repeated Firestore reads"
    }


def check_io_guard(content: str) -> dict:
    """Check that global.io.emit is always guarded."""
    # Find all global.io.emit occurrences
    emit_positions = [m.start() for m in re.finditer(r'global\.io\.emit', content)]
    
    if not emit_positions:
        return {"check": "io_emit_guarded", "passed": True, "evidence": "No global.io.emit calls found"}
    
    unguarded = []
    lines = content.split('\n')
    
    for pos in emit_positions:
        # Get line number
        line_num = content[:pos].count('\n') + 1
        # Check surrounding lines for if (global.io)
        start = max(0, line_num - 4)
        end = min(len(lines), line_num + 1)
        context = '\n'.join(lines[start:end])
        
        if 'if (global.io)' not in context and 'if(global.io)' not in context:
            unguarded.append(f"Line {line_num}")
    
    passed = len(unguarded) == 0
    return {
        "check": "io_emit_guarded",
        "passed": passed,
        "evidence": f"All {len(emit_positions)} global.io.emit call(s) are guarded" if passed
                   else f"FAIL: Unguarded global.io.emit at: {', '.join(unguarded)}"
    }


def check_try_catch(content: str) -> dict:
    """Check async functions have try/catch."""
    async_funcs = re.findall(r'async\s+(?:function\s+\w+|\([^)]*\)\s*=>|\w+\s*=>)', content)
    try_blocks = len(re.findall(r'\btry\s*\{', content))
    
    if not async_funcs:
        return {"check": "async_try_catch", "passed": True, "evidence": "No async functions found"}
    
    # Heuristic: expect roughly equal try blocks to async functions
    ratio = try_blocks / max(len(async_funcs), 1)
    passed = ratio >= 0.8  # Allow small mismatch
    
    return {
        "check": "async_try_catch",
        "passed": passed,
        "evidence": f"{try_blocks} try blocks for {len(async_funcs)} async functions ({ratio:.0%} coverage)" if passed
                   else f"WARNING: Only {try_blocks} try blocks for {len(async_funcs)} async functions — some may be unprotected"
    }


def check_db_guard(content: str) -> dict:
    """Check that db is guarded where it's first used in request handlers."""
    # Look for direct db usage without a guard
    has_db_guard = 'if (!db)' in content or 'if (!db)' in content
    has_db_usage = 'db.collection' in content or 'db.doc' in content
    
    if not has_db_usage:
        return {"check": "db_null_guard", "passed": True, "evidence": "No db usage found"}
    
    return {
        "check": "db_null_guard",
        "passed": has_db_guard,
        "evidence": "if (!db) guard found in file" if has_db_guard
                   else "WARNING: db.collection used but no if (!db) guard found — could crash if Firebase fails to init"
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python quick_validate.py <path-to-file>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    filename = Path(filepath).name
    content = read_file(filepath)
    
    checks = [
        check_module_exports(content, filename),
        check_pricing_not_in_loop(content),
        check_io_guard(content),
        check_try_catch(content),
        check_db_guard(content),
    ]
    
    passed = sum(1 for c in checks if c['passed'])
    total = len(checks)
    all_passed = passed == total
    
    result = {
        "file": filepath,
        "summary": f"{passed}/{total} checks passed",
        "all_passed": all_passed,
        "checks": checks
    }
    
    print(json.dumps(result, indent=2))
    
    if not all_passed:
        print(f"\n⚠️  {total - passed} check(s) failed. Review before grading.")
        sys.exit(1)
    else:
        print(f"\n✅ All {total} safety checks passed.")
        sys.exit(0)


if __name__ == '__main__':
    main()
