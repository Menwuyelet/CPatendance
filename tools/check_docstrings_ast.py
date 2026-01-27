#!/usr/bin/env python3
"""Simple AST-based docstring checker for the `backend/` Python files.

Usage: run from repository root: `python3 tools/check_docstrings_ast.py`
Prints files with missing module/class/function docstrings and parse errors.
"""
import ast
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'backend'

SKIP_DIRS = {'migrations', '__pycache__', 'node_modules', 'static'}

def check_file(path: Path):
    rel = path.relative_to(ROOT)
    try:
        src = path.read_text(encoding='utf-8')
    except Exception as e:
        return {'path': str(rel), 'error': f'read error: {e}'}

    try:
        tree = ast.parse(src)
    except Exception as e:
        return {'path': str(rel), 'error': f'parse error: {e}'}

    missing = {'module': False, 'classes': [], 'functions': []}

    if ast.get_docstring(tree) is None:
        missing['module'] = True

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            if ast.get_docstring(node) is None:
                missing['classes'].append(node.name)
            # check methods
            for child in node.body:
                if isinstance(child, ast.FunctionDef):
                    if ast.get_docstring(child) is None:
                        missing['functions'].append(f'{node.name}.{child.name}')

        elif isinstance(node, ast.FunctionDef):
            if ast.get_docstring(node) is None:
                missing['functions'].append(node.name)

    return {'path': str(rel), 'missing': missing}


def main():
    py_files = list(BACKEND.rglob('*.py'))
    results = []
    for p in py_files:
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        results.append(check_file(p))

    parse_errors = [r for r in results if 'error' in r]
    missing_reports = [r for r in results if 'missing' in r and (r['missing']['module'] or r['missing']['classes'] or r['missing']['functions'])]

    print('\nAST Docstring Checker Report')
    print('--------------------------------')
    print(f'Total Python files scanned: {len(results)}')
    print(f'Files with parse/read errors: {len(parse_errors)}')
    print(f'Files missing docstrings: {len(missing_reports)}\n')

    if parse_errors:
        print('Parse/Read errors:')
        for r in parse_errors:
            print(' -', r['path'], ':', r['error'])
        print()

    if missing_reports:
        print('Files with missing docstrings:')
        for r in missing_reports:
            m = r['missing']
            parts = []
            if m['module']:
                parts.append('module')
            if m['classes']:
                parts.append('classes:' + ','.join(m['classes']))
            if m['functions']:
                parts.append('functions:' + ','.join(m['functions'][:10]) + (',...' if len(m['functions'])>10 else ''))
            print(' -', r['path'], '->', '; '.join(parts))

    else:
        print('All scanned files contain module/class/function docstrings (where applicable).')

    # exit code non-zero if parse errors exist
    sys.exit(1 if parse_errors else 0)


if __name__ == '__main__':
    main()
