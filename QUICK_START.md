# 🚀 Quick Start - Deploy to PythonAnywhere

**Time needed**: 30-60 minutes  
**Your frontend**: Already deployed at `https://amnaystemcam.netlify.app` ✅

## What You're Doing

Deploying your Django backend to PythonAnywhere so your Netlify frontend can communicate with it.

```
Frontend (Netlify) ──API Calls──> Backend (PythonAnywhere)
```

## Prerequisites Checklist

- [ ] PythonAnywhere account created at https://www.pythonanywhere.com
- [ ] Git repository with your code
- [ ] Your PythonAnywhere username: `_______________`

## 5-Minute Overview

### On PythonAnywhere:

1. **Clone your code**
   ```bash
   git clone <your-repo-url>
   cd CPatendance/backend
   ```

2. **Create virtual environment**
   ```bash
   mkvirtualenv cpat-env --python=python3.10
   pip install -r requirements.txt
   ```

3. **Configure environment**
   - Create `.env` file with your settings
   - Run migrations: `python manage.py migrate`
   - Collect static: `python manage.py collectstatic`

4. **Setup web app**
   - Go to Web tab → Add new web app
   - Choose Manual configuration, Python 3.10
   - Set paths and virtualenv
   - Copy WSGI configuration from `pythonanywhere_wsgi.py`

5. **Reload and test**
   - Click Reload button
   - Visit your site

### On Netlify:

6. **Update frontend to use your backend**
   - Set environment variable: `VITE_API_BASE_URL=https://yourusername.pythonanywhere.com`
   - Redeploy

## Files You Need

| File | What It Does |
|------|--------------|
| `PYTHONANYWHERE_DEPLOYMENT.md` | Complete step-by-step guide (READ THIS!) |
| `DEPLOYMENT_CHECKLIST.md` | Track your progress |
| `backend/pythonanywhere_wsgi.py` | Copy this to PythonAnywhere WSGI config |
| `backend/.env.pythonanywhere` | Template for your .env file |

## Essential Commands (On PythonAnywhere)

```bash
# Navigate to project
cd ~/CPatendance/backend

# Activate virtual environment
workon cpat-env

# Install/update dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Create admin user
python manage.py createsuperuser

# Generate secret key (for .env)
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Configuration Checklist

On PythonAnywhere Web tab, set:

- [ ] **Source code**: `/home/yourusername/CPatendance/backend`
- [ ] **Virtualenv**: `/home/yourusername/.virtualenvs/cpat-env`
- [ ] **WSGI file**: Copy from `backend/pythonanywhere_wsgi.py` (replace username!)
- [ ] **Static files**: `/static/` → `/home/yourusername/CPatendance/backend/staticfiles`

## Your .env File (Critical!)

Create this on PythonAnywhere at `~/CPatendance/backend/.env`:

```env
DJANGO_SECRET_KEY=<generate-new-one>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourusername.pythonanywhere.com,.pythonanywhere.com
DJANGO_DB_PATH=/home/yourusername/CPatendance/backend/db.sqlite3
BIOMETRIC_SECRET_KEY=<generate-new-one>
```

**Generate keys**:
- Django secret: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- Biometric key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`

## Final Integration Steps

1. **Update Django settings** - Add to `config/settings.py`:
   ```python
   CSRF_TRUSTED_ORIGINS = [
       "https://amnaystemcam.netlify.app",
       "https://yourusername.pythonanywhere.com",  # Add this!
   ]
   ```

2. **Commit and push** to Git

3. **Pull on PythonAnywhere**: `git pull`

4. **Reload** your web app

5. **Update Netlify** environment variable to point to your PythonAnywhere URL

6. **Test** everything!

## Common Issues

| Problem | Solution |
|---------|----------|
| 500 Error | Check error log in Web tab |
| CORS Error | Verify `CORS_ALLOWED_ORIGINS` in settings.py |
| Module not found | Activate virtualenv: `workon cpat-env` |
| Static files missing | Run `python manage.py collectstatic` |

## Testing Your Deployment

- [ ] Backend API: `https://yourusername.pythonanywhere.com/api/`
- [ ] Admin panel: `https://yourusername.pythonanywhere.com/admin/`
- [ ] Frontend integration: Visit `https://amnaystemcam.netlify.app` and test features

## Next Steps

✅ Once everything works:

1. Monitor error logs for 24 hours
2. Test all features thoroughly
3. Document your admin credentials
4. Set up regular backups (if using important data)

## Getting Help

- 📖 **Full guide**: See `PYTHONANYWHERE_DEPLOYMENT.md`
- ✅ **Checklist**: See `DEPLOYMENT_CHECKLIST.md`
- 🔍 **Changes**: See `DEPLOYMENT_CHANGES_SUMMARY.md`
- 💬 **Support**: https://help.pythonanywhere.com/

---

## Ready? Start Here! 👇

**→ Open `PYTHONANYWHERE_DEPLOYMENT.md` and follow it step by step**

Use `DEPLOYMENT_CHECKLIST.md` to track your progress as you go!

Good luck! 🎉
