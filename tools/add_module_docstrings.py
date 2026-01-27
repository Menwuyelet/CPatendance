#!/usr/bin/env python3
"""
Safely add only module-level docstrings to backend Python files.

This script will not touch class or function bodies to avoid indentation
and syntax issues. It will back up originals to `.bak` before writing.
"""

from pathlib import Path
import re

ROOT = Path('backend')


def should_skip(p: Path) -> bool:
    return any(part in ('migrations', '__pycache__') for part in p.parts)


def add_module_docstring(path: Path) -> bool:
    src = path.read_text()
    if not src.strip():
        return False
    lines = src.splitlines(keepends=True)
    i = 0
    if lines and lines[0].startswith('#!'):
        i = 1
    if len(lines) > i and re.match(r"#.*coding[:=]\s*([-\w.]+)", lines[i]):
        i += 1
    if i < len(lines) and re.match(r"\s*[ruRU]{0,2}['\"]{3}", lines[i]):
        return False
    ds = f'"""Module {path}\n\nAuto-generated module docstring.\n"""\n\n'
    bak = path.with_suffix(path.suffix + '.bak')
    bak.write_text(src)
    lines.insert(i, ds)
    path.write_text(''.join(lines))
    return True


def main():
    changed = []
    for p in ROOT.rglob('*.py'):
        if should_skip(p):
            continue
        try:
            if add_module_docstring(p):
                changed.append(str(p))
        except Exception:
            continue
    print('Modified files:', len(changed))
    for f in changed:
        print(' -', f)

if __name__ == '__main__':
    main()
