#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import warnings
import logging

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Ensure project apps are importable as top-level packages (accounts, employees, etc.)
sys.path.insert(0, os.path.join(BASE_DIR, "apps"))

# Silence expected ONNXRuntime provider warnings during tests/CLI usage.
warnings.filterwarnings(
    "ignore",
    message=".*CUDAExecutionProvider.*",
    category=UserWarning,
)

# Quiet noisy request warnings from expected 4xx responses in tests.
if "test" in sys.argv:
    logging.disable(logging.WARNING)


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
