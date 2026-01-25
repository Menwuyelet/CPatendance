# Deployment Changes Summary

This document summarizes all changes made to prepare your application for PythonAnywhere deployment.

## Files Created

### 1. `backend/pythonanywhere_wsgi.py`
**Purpose**: PythonAnywhere-specific WSGI configuration file

**What it does**:
- Configures Python paths for your Django project
- Activates virtual environment
- Loads environment variables from `.env` file
- Initializes Django WSGI application

**Action Required**: 
- Copy this file's content to PythonAnywhere's WSGI configuration
- Replace `yourusername` with your actual PythonAnywhere username

### 2. `backend/.env.pythonanywhere`
**Purpose**: Template for environment variables on PythonAnywhere

**What it contains**:
- Django secret key (must be changed!)
- Debug mode setting
- Allowed hosts configuration
- Database path
- Biometric encryption key

**Action Required**:
- Copy to `.env` on PythonAnywhere
- Generate new secret keys
- Update all `yourusername` placeholders

### 3. `PYTHONANYWHERE_DEPLOYMENT.md`
**Purpose**: Complete step-by-step deployment guide

**Covers**:
- Setting up PythonAnywhere account
- Uploading code
- Creating virtual environment
- Configuring Django settings
- Web app configuration
- Frontend integration with Netlify
- Troubleshooting common issues
- Security best practices

### 4. `DEPLOYMENT_CHECKLIST.md`
**Purpose**: Quick reference checklist for deployment

**Use it to**:
- Track deployment progress
- Ensure no steps are missed
- Document your deployment information
- Quick reference for common issues

## Files Modified

### 1. `backend/requirements.txt`
**Changes**:
- Added `python-dotenv` for environment variable management
- Added `mysqlclient` for MySQL support (optional)

**Why**: PythonAnywhere compatibility and production best practices

### 2. `backend/config/settings.py`
**Changes**:

**Line 39** - Updated ALLOWED_HOSTS:
```python
# Before:
"localhost,127.0.0.1,cpat-backend.fly.dev"

# After:
"localhost,127.0.0.1,cpat-backend.fly.dev,.pythonanywhere.com"
```

**Lines 209-210** - Updated CSRF_TRUSTED_ORIGINS with placeholder:
```python
CSRF_TRUSTED_ORIGINS = [
    "https://amnaystemcam.netlify.app",
    # "https://yourusername.pythonanywhere.com",  # ← Uncomment and update
]
```

**Why**: Allow PythonAnywhere domains to access your Django application

## Integration Overview

```
┌─────────────────────────────────────────────────────┐
│                    USER'S BROWSER                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ HTTPS
                   ▼
┌──────────────────────────────────────────────────────┐
│              NETLIFY (Frontend)                      │
│         https://amnaystemcam.netlify.app             │
│                                                       │
│  - React Application (Vite)                          │
│  - Static Files                                      │
│  - Environment: VITE_API_BASE_URL                    │
└──────────────────┬───────────────────────────────────┘
                   │
                   │ API Calls (HTTPS)
                   ▼
┌──────────────────────────────────────────────────────┐
│         PYTHONANYWHERE (Backend)                     │
│     https://yourusername.pythonanywhere.com          │
│                                                       │
│  - Django REST API                                   │
│  - Face Recognition Engine                           │
│  - Database (SQLite/MySQL)                           │
│  - Static Files (/static/, /media/)                  │
└──────────────────────────────────────────────────────┘
```

## Configuration Flow

### On PythonAnywhere:

1. **Web App Settings**:
   - Source code: `/home/yourusername/CPatendance/backend`
   - Virtual environment: `/home/yourusername/.virtualenvs/cpat-env`
   - WSGI file: Uses `pythonanywhere_wsgi.py` content

2. **Environment Variables** (`.env` file):
   ```
   DJANGO_SECRET_KEY=<production-secret>
   DJANGO_DEBUG=False
   DJANGO_ALLOWED_HOSTS=yourusername.pythonanywhere.com
   ```

3. **Static Files Mapping**:
   - `/static/` → `backend/staticfiles/`
   - `/media/` → `backend/media/`

### On Netlify:

1. **Environment Variables**:
   ```
   VITE_API_BASE_URL=https://yourusername.pythonanywhere.com
   ```

2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`

## Security Considerations

### ✅ Already Configured:
- CORS headers for cross-origin requests
- CSRF protection
- HTTPS enforcement (via Secure Proxy SSL Header)
- WhiteNoise for static file serving
- JWT authentication

### ⚠️ You Must Configure:
1. Generate new `DJANGO_SECRET_KEY` for production
2. Set `DJANGO_DEBUG=False` in production `.env`
3. Generate new `BIOMETRIC_SECRET_KEY`
4. Add your actual PythonAnywhere domain to `CSRF_TRUSTED_ORIGINS`
5. Keep `.env` file secure (never commit to Git)

## Next Steps

1. **Before Deployment**:
   - [ ] Push all changes to your Git repository
   - [ ] Review security settings
   - [ ] Test locally one more time

2. **During Deployment**:
   - [ ] Follow `PYTHONANYWHERE_DEPLOYMENT.md` step by step
   - [ ] Use `DEPLOYMENT_CHECKLIST.md` to track progress
   - [ ] Test each step before moving to the next

3. **After Deployment**:
   - [ ] Test all API endpoints
   - [ ] Verify face recognition works
   - [ ] Monitor error logs for 24-48 hours
   - [ ] Update Netlify environment variables
   - [ ] Test frontend-backend integration

## Rollback Plan

If something goes wrong:

1. **PythonAnywhere**: 
   - Check error log: Web tab → Error log
   - Review WSGI configuration
   - Verify virtual environment

2. **Netlify**:
   - Revert environment variables
   - Check previous deployments
   - Can deploy from earlier Git commit

## Support Resources

- **PythonAnywhere**: https://help.pythonanywhere.com/
- **Django Deployment**: https://docs.djangoproject.com/en/stable/howto/deployment/
- **Your Error Logs**: Web tab on PythonAnywhere dashboard

## Notes

- All paths use Linux format for PythonAnywhere (`/home/username/...`)
- Virtual environment is in `~/.virtualenvs/cpat-env`
- Database defaults to SQLite (can upgrade to MySQL on paid plans)
- Static files are served by WhiteNoise (no separate web server needed)
- Face recognition libraries (insightface, opencv) may need special installation steps

---

**Good luck with your deployment! 🚀**

If you encounter issues, refer to the Troubleshooting section in `PYTHONANYWHERE_DEPLOYMENT.md`.
