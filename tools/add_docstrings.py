#!/usr/bin/env python3
"""
Safe docstring inserter for backend Python files.

This script only inserts well-formed module, class and function docstrings
when they are missing. It operates cautiously:
- Skips `migrations` and `__pycache__` directories.
- Backs up the original file to `<file>.bak` before writing changes.

It uses the AST to detect missing docstrings and inserts properly indented
triple-quoted strings at the correct locations.
"""

from pathlib import Path
import ast
import re

ROOT = Path('backend')


def should_skip(p: Path) -> bool:
    return any(part in ('migrations', '__pycache__') for part in p.parts)


def insert_module_docstring(lines, path_str):
    # Find insertion index after shebang and encoding lines
    i = 0
    if lines and lines[0].startswith('#!'):
        i = 1
    if len(lines) > i and re.match(r"#.*coding[:=]\s*([-\w.]+)", lines[i]):
        i += 1
    # If already a module docstring, do nothing
    if i < len(lines) and re.match(r"\s*[ruRU]{0,2}['\"]{3}", lines[i]):
        return lines
    ds = f'"""Module {path_str}\n\nAuto-generated module docstring.\n"""\n\n'
    lines.insert(i, ds)
    return lines


def make_docstring_block(indent: str, text: str) -> str:
    # Create an indented triple-quoted docstring block ending with a newline
    inner = text.replace('\n', '\n' + indent)
    return indent + '"""' + inner + '\n' + indent + '"""\n'


def add_docstrings_to_file(path: Path) -> bool:
    src = path.read_text()
    if not src.strip():
        return False

    # Parse original to find missing docstrings
    try:
        tree = ast.parse(src)
    except Exception:
        return False

    lines = src.splitlines(keepends=True)
    original = ''.join(lines)

    changed = False

    # Module docstring
    if ast.get_docstring(tree) is None:
        lines = insert_module_docstring(lines, str(path))
        changed = True

    # Re-parse after possible module insertion to get correct lineno offsets
    src2 = ''.join(lines)
    try:
        tree2 = ast.parse(src2)
    except Exception:
        # If inserting module docstring broke parsing, abort
        return False

    inserts = []  # (lineno, text) insert before lineno (1-based)

    for node in ast.walk(tree2):
        if isinstance(node, (ast.ClassDef,)):
            if ast.get_docstring(node) is None:
                # Insert after the class signature, before first body line
                insert_at = node.body[0].lineno if node.body else node.lineno + 1
                indent = ' ' * node.col_offset
                text = make_docstring_block(indent + '    ', f'{node.name}\n\nClass auto-generated docstring.')
                inserts.append((insert_at, text))
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if ast.get_docstring(node) is None:
                insert_at = node.body[0].lineno if node.body else node.lineno + 1
                indent = ' ' * node.col_offset
                text = make_docstring_block(indent + '    ', f'{node.name}()\n\nAuto-generated function docstring.')
                inserts.append((insert_at, text))

    if inserts:
        # Sort descending so earlier inserts don't invalidate later line numbers
        inserts.sort(reverse=True, key=lambda x: x[0])
        for lineno, text in inserts:
            idx = max(0, lineno - 1)
            lines.insert(idx, text)
            changed = True

    if changed:
        # backup
        bak = path.with_suffix(path.suffix + '.bak')
        bak.write_text(original)
        path.write_text(''.join(lines))
        return True

    return False


def main():
    changed_files = []
    for p in ROOT.rglob('*.py'):
        if should_skip(p):
            continue
        try:
            if add_docstrings_to_file(p):
                changed_files.append(str(p))
        except Exception:
            # Never crash the whole run on a single file
            continue

    print('Modified files:', len(changed_files))
    for f in changed_files:
        print(' -', f)


if __name__ == '__main__':
    main()
