#!/usr/bin/env python3
"""
Add docstrings to classes and functions whose first body node is simple.

This safer pass only inserts docstrings when the first statement inside a
class or function is one of: Expr, Pass, Return, Assign, AnnAssign. This
avoids inserting docstrings before complex control structures which can
lead to syntax issues.
"""
from pathlib import Path
import ast
import re

ROOT = Path('backend')


def should_skip(p: Path) -> bool:
    return any(part in ('migrations', '__pycache__') for part in p.parts)


def make_block(indent: str, inner: str) -> str:
    inner = inner.replace('\n', '\n' + indent)
    return indent + '"""' + inner + '\n' + indent + '"""\n'


def add_safe_docstrings(path: Path) -> bool:
    src = path.read_text()
    if not src.strip():
        return False
    try:
        tree = ast.parse(src)
    except Exception:
        return False
    lines = src.splitlines(keepends=True)
    original = ''.join(lines)
    inserts = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) or isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
            if ast.get_docstring(node) is not None:
                continue
            if not node.body:
                continue
            first = node.body[0]
            if isinstance(first, (ast.Expr, ast.Pass, ast.Return, ast.Assign, ast.AnnAssign)):
                insert_at = first.lineno
                indent = ' ' * (node.col_offset + 4)
                if isinstance(node, ast.ClassDef):
                    text = make_block(indent, f'{node.name}\n\nClass auto-generated docstring.')
                else:
                    text = make_block(indent, f'{node.name}()\n\nAuto-generated function docstring.')
                inserts.append((insert_at, text))
    if not inserts:
        return False
    inserts.sort(reverse=True, key=lambda x: x[0])
    for lineno, text in inserts:
        idx = max(0, lineno - 1)
        lines.insert(idx, text)
    # backup
    bak = path.with_suffix(path.suffix + '.bak')
    bak.write_text(original)
    path.write_text(''.join(lines))
    return True


def main():
    changed = []
    for p in ROOT.rglob('*.py'):
        if should_skip(p):
            continue
        try:
            if add_safe_docstrings(p):
                changed.append(str(p))
        except Exception:
            continue
    print('Modified files:', len(changed))
    for f in changed:
        print(' -', f)

if __name__ == '__main__':
    main()
