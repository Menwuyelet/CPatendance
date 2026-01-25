# Quick PythonAnywhere Deployment Checklist

Use this checklist to track your deployment progress.

## Pre-Deployment

- [ ] PythonAnywhere account created
- [ ] Username noted: `________________`
- [ ] Code pushed to Git repository

## On PythonAnywhere

### 1. Code Setup
- [ ] Opened Bash console
- [ ] Cloned repository: `git clone <your-repo-url>`
- [ ] Navigated to backend: `cd ~/CPatendance/backend`

### 2. Virtual Environment
- [ ] Created virtualenv: `mkvirtualenv cpat-env --python=python3.10`
- [ ] Activated: `workon cpat-env`
- [ ] Installed packages: `pip install -r requirements.txt`

### 3. Environment Configuration
- [ ] Created `.env` file
- [ ] Generated new Django secret key
- [ ] Set `DJANGO_DEBUG=False`
- [ ] Updated `DJANGO_ALLOWED_HOSTS` with your PythonAnywhere domain
- [ ] Updated `DJANGO_DB_PATH` with correct path
- [ ] Set `BIOMETRIC_SECRET_KEY`

### 4. Django Setup
- [ ] Ran migrations: `python manage.py migrate`
- [ ] Collected static files: `python manage.py collectstatic`
- [ ] Created superuser: `python manage.py createsuperuser`

### 5. Web App Configuration
- [ ] Created new web app (Manual configuration)
- [ ] Set Source code: `/home/yourusername/CPatendance/backend`
- [ ] Set Working directory: `/home/yourusername/CPatendance/backend`
- [ ] Set Virtualenv: `/home/yourusername/.virtualenvs/cpat-env`

### 6. WSGI Configuration
- [ ] Opened WSGI configuration file
- [ ] Deleted all existing content
- [ ] Copied content from `backend/pythonanywhere_wsgi.py`
- [ ] Replaced `yourusername` with actual username
- [ ] Saved WSGI file

### 7. Static Files
- [ ] Added `/static/` → `/home/yourusername/CPatendance/backend/staticfiles`
- [ ] Added `/media/` → `/home/yourusername/CPatendance/backend/media`

### 8. Backend Testing
- [ ] Clicked Reload button
- [ ] Visited: `https://yourusername.pythonanywhere.com/api/`
- [ ] Tested admin: `https://yourusername.pythonanywhere.com/admin/`
- [ ] Checked error logs (if any issues)

## Frontend Integration (Netlify)

### 1. Update Settings
- [ ] Updated `CSRF_TRUSTED_ORIGINS` in `backend/config/settings.py`
- [ ] Added: `https://yourusername.pythonanywhere.com`
- [ ] Committed and pushed changes
- [ ] Pulled changes on PythonAnywhere: `git pull`
- [ ] Reloaded web app

### 2. Netlify Configuration
- [ ] Went to Netlify site settings
- [ ] Updated environment variable: `VITE_API_BASE_URL`
- [ ] Set to: `https://yourusername.pythonanywhere.com`
- [ ] Triggered Netlify redeploy

### 3. Integration Testing
- [ ] Visited frontend: `https://amnaystemcam.netlify.app`
- [ ] Tested login functionality
- [ ] Tested API calls
- [ ] Tested face recognition features
- [ ] Checked browser console for errors

## Security Verification

- [ ] `DEBUG = False` confirmed
- [ ] Strong secret key in use
- [ ] HTTPS working (automatic on PythonAnywhere)
- [ ] CORS properly configured
- [ ] CSRF trusted origins set

## Post-Deployment

- [ ] Documented your URLs:
  - Backend: `https://________________.pythonanywhere.com`
  - Frontend: `https://amnaystemcam.netlify.app`
- [ ] Saved admin credentials securely
- [ ] Tested all major features
- [ ] Monitored error logs for 24 hours

## Common Issues & Solutions

**500 Error?**
→ Check `/var/www/yourusername_pythonanywhere_com_wsgi.py` error log

**CORS Error?**
→ Verify `CORS_ALLOWED_ORIGINS` includes Netlify URL

**Static files missing?**
→ Run `python manage.py collectstatic` and reload

**Module not found?**
→ `workon cpat-env` then `pip install -r requirements.txt`

---

## Your Deployment Info

```
PythonAnywhere Username: ________________
Backend URL: https://________________.pythonanywhere.com
Frontend URL: https://amnaystemcam.netlify.app
Admin Username: ________________
Deployment Date: ________________
Python Version: ________________
```

**Need help?** See `PYTHONANYWHERE_DEPLOYMENT.md` for detailed instructions.
