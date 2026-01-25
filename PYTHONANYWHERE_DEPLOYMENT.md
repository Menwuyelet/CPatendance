# PythonAnywhere Deployment Guide

Complete guide to deploy your Django backend to PythonAnywhere and integrate with your Netlify frontend.

## Prerequisites

- PythonAnywhere account (free or paid)
- Git repository with your code
- Frontend already deployed to Netlify at `https://amnaystemcam.netlify.app`

## Step 1: Create PythonAnywhere Account

1. Go to https://www.pythonanywhere.com and sign up
2. Choose a plan (Free tier works for testing, Paid for production)
3. Note your username - you'll need it throughout this guide

## Step 2: Upload Your Code to PythonAnywhere

### Option A: Using Git (Recommended)

1. Open a **Bash console** on PythonAnywhere (from Dashboard > Consoles)

2. Clone your repository:
```bash
cd ~
git clone https://github.com/YOUR-USERNAME/CPatendance.git
cd CPatendance/backend
```

### Option B: Upload Files Manually

1. Use the **Files** tab to upload your backend folder
2. Navigate to `/home/yourusername/`

## Step 3: Create Virtual Environment

In the Bash console:

```bash
# Navigate to your project
cd ~/CPatendance/backend

# Create virtual environment
mkvirtualenv cpat-env --python=python3.10

# The virtualenv will be created at: ~/.virtualenvs/cpat-env

# Activate it (if not already activated)
workon cpat-env

# Install requirements
pip install -r requirements.txt
```

**IMPORTANT**: If you get errors installing `opencv-python-headless` or `insightface`, you may need to:
- Use Python 3.9 or 3.10 (PythonAnywhere supports these)
- Install system dependencies first (contact PythonAnywhere support if needed)

## Step 4: Configure Environment Variables

1. Create `.env` file in the backend directory:

```bash
cd ~/CPatendance/backend
nano .env
```

2. Copy content from `.env.pythonanywhere` template and update:

```env
# REPLACE 'yourusername' with your actual PythonAnywhere username!
DJANGO_SECRET_KEY=your-generated-secret-key-here
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourusername.pythonanywhere.com,.pythonanywhere.com
DJANGO_DB_PATH=/home/yourusername/CPatendance/backend/db.sqlite3
BIOMETRIC_SECRET_KEY=your-biometric-key-here
```

**Generate a new secret key**:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

3. Save and exit (Ctrl+X, then Y, then Enter)

## Step 5: Update Django Settings

1. Edit `config/settings.py`:

```bash
nano ~/CPatendance/backend/config/settings.py
```

2. Find the `CSRF_TRUSTED_ORIGINS` section (around line 208) and add your PythonAnywhere domain:

```python
CSRF_TRUSTED_ORIGINS = [
    "https://amnaystemcam.netlify.app",
    "https://yourusername.pythonanywhere.com",  # ← Add this line
]
```

3. Save and exit

## Step 6: Run Django Migrations

```bash
cd ~/CPatendance/backend
workon cpat-env
python manage.py migrate
python manage.py collectstatic --noinput
```

## Step 7: Create Superuser (Optional but recommended)

```bash
python manage.py createsuperuser
```

Follow the prompts to create an admin account.

## Step 8: Configure Web App on PythonAnywhere

1. Go to **Web** tab on PythonAnywhere dashboard
2. Click **Add a new web app**
3. Choose **Manual configuration** (NOT Django wizard)
4. Select **Python 3.10** (or your chosen version)

### Configure the Web App:

#### A. Source Code Path
```
/home/yourusername/CPatendance/backend
```

#### B. Working Directory
```
/home/yourusername/CPatendance/backend
```

#### C. Virtualenv Path
```
/home/yourusername/.virtualenvs/cpat-env
```

#### D. WSGI Configuration File

1. Click on the WSGI configuration file link (e.g., `/var/www/yourusername_pythonanywhere_com_wsgi.py`)

2. **DELETE all existing content** in the file

3. Copy the entire content from `backend/pythonanywhere_wsgi.py`

4. **IMPORTANT**: Replace `yourusername` with your actual PythonAnywhere username in the WSGI file:

```python
# Replace this line:
username = 'yourusername'  # ← CHANGE THIS!

# With your actual username:
username = 'actualusername'  # e.g., 'john123'
```

5. Save the file (green button at top)

## Step 9: Configure Static Files

In the **Web** tab, scroll to **Static files** section:

Add these entries:

| URL | Directory |
|-----|-----------|
| `/static/` | `/home/yourusername/CPatendance/backend/staticfiles` |
| `/media/` | `/home/yourusername/CPatendance/backend/media` |

Replace `yourusername` with your actual username.

## Step 10: Reload Web App

1. Scroll to the top of the **Web** tab
2. Click the big green **Reload yourusername.pythonanywhere.com** button
3. Wait for it to reload (takes a few seconds)

## Step 11: Test Your Backend

1. Visit: `https://yourusername.pythonanywhere.com/api/`
2. You should see the Django REST Framework browsable API or your API documentation
3. Test the admin: `https://yourusername.pythonanywhere.com/admin/`

## Step 12: Update Netlify Frontend Configuration

### Update Netlify Environment Variables:

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** > **Environment variables**
3. Update or add:

```
VITE_API_BASE_URL=https://yourusername.pythonanywhere.com
```

### Update `netlify.toml` (if using proxy):

If you're using a Netlify proxy, update your `netlify.toml` in the frontend:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://yourusername.pythonanywhere.com/api/:splat"
  status = 200
  force = true
```

4. **Redeploy your frontend** on Netlify for changes to take effect

## Step 13: Test the Integration

1. Visit your frontend: `https://amnaystemcam.netlify.app`
2. Try logging in or using face recognition features
3. Check that API calls work correctly

## Troubleshooting

### 500 Internal Server Error

1. Check error logs in PythonAnywhere:
   - **Web** tab > **Log files** section
   - Click on **Error log** link

2. Common issues:
   - Incorrect paths in WSGI file
   - Missing environment variables
   - Database not migrated
   - Static files not collected

### CORS Errors

1. Make sure your PythonAnywhere domain is in `CORS_ALLOWED_ORIGINS` in `settings.py`
2. Check that `django-cors-headers` is installed
3. Verify CORS middleware is in `MIDDLEWARE` list

### Static Files Not Loading

1. Run `python manage.py collectstatic` again
2. Verify static file mappings in Web tab
3. Check STATIC_ROOT in settings.py

### Module Import Errors

1. Verify virtual environment is correctly set in Web tab
2. Check all packages are installed: `pip list`
3. Make sure apps path is in sys.path (check WSGI file)

### Database Errors

1. Check database path in .env file
2. Run migrations again: `python manage.py migrate`
3. Verify database file permissions

## Updating Your Application

When you make changes to your code:

```bash
# SSH into PythonAnywhere or use Bash console
cd ~/CPatendance/backend
git pull origin main  # or your branch name

workon cpat-env
pip install -r requirements.txt  # if dependencies changed
python manage.py migrate  # if models changed
python manage.py collectstatic --noinput  # if static files changed
```

Then go to **Web** tab and click **Reload**.

## Security Checklist

- [ ] `DEBUG = False` in production
- [ ] Strong `DJANGO_SECRET_KEY` generated and kept secret
- [ ] Database credentials secured (if using MySQL)
- [ ] `ALLOWED_HOSTS` properly configured
- [ ] HTTPS enabled (automatic on PythonAnywhere)
- [ ] CORS origins restricted to your Netlify domain
- [ ] CSRF trusted origins configured
- [ ] Biometric encryption key kept secret

## Performance Optimization

1. **Use MySQL instead of SQLite** for better performance (paid plans)
2. **Enable gzip compression** in Django settings
3. **Use CDN for static files** (optional)
4. **Optimize database queries** in your views
5. **Implement caching** with Redis (available on paid plans)

## Getting Help

- PythonAnywhere Help: https://help.pythonanywhere.com/
- PythonAnywhere Forums: https://www.pythonanywhere.com/forums/
- Django Documentation: https://docs.djangoproject.com/

## Your Deployment Info

Fill this in for quick reference:

```
PythonAnywhere Username: _______________
Backend URL: https://________________.pythonanywhere.com
Frontend URL: https://amnaystemcam.netlify.app
Database: SQLite / MySQL (circle one)
Python Version: _______________
Django Version: 5.1.7
```

---

**Congratulations! Your backend is now deployed on PythonAnywhere and integrated with your Netlify frontend! 🎉**
