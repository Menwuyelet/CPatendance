# CPatendance Frontend Deployment Guide

## Deploy Options

### Option 1: Vercel (Recommended for Speed)

#### Quick Deploy via CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy from frontend directory
cd frontend
vercel --prod
```

#### Deploy via Git Integration
1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Add frontend deployment config"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click "Add New Project" → "Import Git Repository"
   - Select your repository
   - Configure settings:
     - **Framework Preset:** Vite
     - **Build Command:** `npm install && npm run build`
     - **Output Directory:** `dist`
   - Click "Deploy"

3. **Add Environment Variable**
   - Go to Settings → Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://amnsystembackend.onrender.com`

---

### Option 2: Netlify

#### Quick Deploy via CLI
```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Deploy from project root
netlify deploy --prod --dir=frontend/dist
```

#### Deploy via Git Integration
1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Add frontend deployment config"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select your Git provider
   - Choose this repository
   - Configure settings:
     - **Base directory:** `frontend`
     - **Build command:** `npm install && npm run build`
     - **Publish directory:** `frontend/dist`
   - Click "Deploy site"

3. **Add Environment Variable**
   - Go to Site settings → Environment variables
   - Add: `VITE_API_BASE_URL` = `https://amnsystembackend.onrender.com`

---

## Local Build Test

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=https://amnsystembackend.onrender.com
```

Or set it in your hosting platform:
- **Vercel:** Settings → Environment Variables
- **Netlify:** Site settings → Environment variables

---

## Backend CORS Configuration

Add your frontend URL to Django settings (`backend/config/settings.py`):

```python
CORS_ALLOWED_ORIGINS = [
    "https://your-vercel-site.vercel.app",
    "https://your-netlify-site.netlify.app",
]

CSRF_TRUSTED_ORIGINS = [
    "https://your-vercel-site.vercel.app",
    "https://your-netlify-site.netlify.app",
]
```

---

## Troubleshooting

### API calls failing
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS settings on backend
- Ensure backend URL is accessible

### Build errors
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 401 Unauthorized errors
- Ensure `CORS_ALLOW_CREDENTIALS = True` on backend
- Check JWT token handling

---

## Features Included

- ✅ SPA routing support (React Router)
- ✅ Security headers (XSS, frame options, etc.)
- ✅ Asset caching (1 year for immutable assets)
- ✅ Multi-environment support
