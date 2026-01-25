# +++++++++++ DJANGO WSGI CONFIGURATION FOR PYTHONANYWHERE +++++++++++
# This file contains the WSGI configuration required to serve up your
# Django application on PythonAnywhere.
#
# INSTRUCTIONS:
# 1. Replace 'yourusername' with your actual PythonAnywhere username
# 2. Update the path to match where you've cloned your repository
# 3. Copy this content to the WSGI configuration file in PythonAnywhere Web tab

import os
import sys

# ==================== CONFIGURE THESE PATHS ====================
# Replace 'yourusername' with your actual PythonAnywhere username
username = 'yourusername'  # ← CHANGE THIS!

# Path to your project directory (where manage.py is located)
project_home = f'/home/{username}/CPatendance/backend'

# Path to your virtual environment
virtualenv_path = f'/home/{username}/.virtualenvs/cpat-env'

# ================================================================

# Add your project directory to the sys.path
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Add the apps directory to sys.path (consistent with manage.py)
apps_path = os.path.join(project_home, 'apps')
if apps_path not in sys.path:
    sys.path.insert(0, apps_path)

# Set environment variables
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'

# Activate virtual environment
activate_this = os.path.join(virtualenv_path, 'bin', 'activate_this.py')
if os.path.exists(activate_this):
    with open(activate_this) as f:
        exec(f.read(), {'__file__': activate_this})

# Load environment variables from .env file if it exists
env_file = os.path.join(project_home, '.env')
if os.path.exists(env_file):
    from dotenv import load_dotenv
    load_dotenv(env_file)

# This application object is used by the development server
# as well as any WSGI server configured to use this file.
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
