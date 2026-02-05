#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies from your pinned requirements.txt
pip install -r requirements.txt


# Collect static files for the Django Admin
python manage.py collectstatic --no-input

# Apply database migrations
python manage.py migrate