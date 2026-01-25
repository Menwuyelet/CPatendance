# Backend Deployment Files

This directory contains files specifically for deploying your Django backend to PythonAnywhere.

## 📁 Deployment Files

### `pythonanywhere_wsgi.py`
**WSGI configuration for PythonAnywhere**

This file configures how PythonAnywhere runs your Django application. When setting up your web app on PythonAnywhere, you'll copy the contents of this file into the WSGI configuration file provided by PythonAnywhere.

**Important**: Replace `yourusername` with your actual PythonAnywhere username!

### `.env.pythonanywhere`
**Environment variables template**

This is a template showing what environment variables you need to set on PythonAnywhere. On the server, you'll create a `.env` file based on this template.

**Security Note**: Never commit your actual `.env` file to Git! It's already in `.gitignore`.

## 🚀 Quick Start

1. **Read the main deployment guide**:
   - See `/PYTHONANYWHERE_DEPLOYMENT.md` in the project root
   - This has complete step-by-step instructions

2. **Use the checklist**:
   - See `/DEPLOYMENT_CHECKLIST.md` in the project root
   - Track your progress and ensure nothing is missed

3. **Review changes**:
   - See `/DEPLOYMENT_CHANGES_SUMMARY.md` in the project root
   - Understand what was modified for deployment

## 📋 What You'll Need

- PythonAnywhere account (sign up at https://www.pythonanywhere.com)
- Your Git repository URL
- About 30-60 minutes for first-time setup

## 🔗 Integration

Your backend will integrate with:
- **Frontend**: Already deployed at `https://amnaystemcam.netlify.app`
- **Database**: SQLite (default) or MySQL (optional, paid plans)
- **Static Files**: Served via WhiteNoise middleware

## 📦 Dependencies

All required packages are in `requirements.txt`:
- Django 5.1.7
- Django REST Framework
- CORS headers
- Face recognition libraries (opencv, insightface)
- And more...

These will be installed when you run `pip install -r requirements.txt` on PythonAnywhere.

## 🔐 Security

Before deploying, make sure to:
1. Generate a new `DJANGO_SECRET_KEY`
2. Set `DJANGO_DEBUG=False`
3. Update `ALLOWED_HOSTS` with your domain
4. Keep your `.env` file secure
5. Use strong passwords for your admin account

## ❓ Need Help?

- **Detailed Instructions**: `/PYTHONANYWHERE_DEPLOYMENT.md`
- **Quick Checklist**: `/DEPLOYMENT_CHECKLIST.md`
- **PythonAnywhere Help**: https://help.pythonanywhere.com/
- **Django Docs**: https://docs.djangoproject.com/

## 📝 Notes

- The `.env` file is not tracked by Git (see `.gitignore`)
- Static files will be collected to `staticfiles/` directory
- Media uploads go to `media/` directory
- Database file (`db.sqlite3`) is also not tracked by Git

---

**Ready to deploy? Start with `/PYTHONANYWHERE_DEPLOYMENT.md`! 🎉**
