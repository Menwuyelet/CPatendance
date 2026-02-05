# Netlify Deployment Guide for CPatendance Frontend

## Prerequisites

### 1. Install Required Tools
```bash
# Install Node.js 20+
# Download from: https://nodejs.org/

# Verify installation
node --version  # Should be 20.x.x
npm --version
```

### 2. Install Git
```bash
# Download from: https://git-scm.com/
# Verify installation
git --version
```

---

## Local Build Test

Before deploying to Netlify, test the build locally:

```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Expected output:** `dist/` folder with optimized static files

---

## Environment Variables

Create a `.env.production` file in the `frontend/` directory:

```env
# API Base URL - Change to your backend URL
VITE_API_BASE_URL=https://your-backend-api.com/api

# Optional: Backend URL for rewrites
VITE_BACKEND_URL=https://your-backend-api.com
```

---

## Deployment Steps

### Option 1: Deploy via Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy from frontend directory
cd frontend
netlify deploy --prod --dir=dist

# Alternative: Link to existing site
netlify link
netlify deploy --prod
```

### Option 2: Deploy via Git Integration

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Optimize frontend for production"
   git push origin main
   ```

2. **Connect to Netlify:**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select your Git provider
   - Choose your repository
   - Configure settings:
     - **Base directory:** `frontend`
     - **Build command:** `npm run build`
     - **Publish directory:** `dist`
   - Click "Deploy site"

3. **Set Environment Variables:**
   - Go to Site settings → Environment variables
   - Add:
     - `VITE_API_BASE_URL` = Your backend API URL
     - `VITE_BACKEND_URL` = Your backend URL (optional)

4. **Configure Build Settings:**
   - Go to Site settings → Build & deploy
   - Ensure:
     - Node version: `20`
     - Build command: `npm run build`
     - Publish directory: `dist`

---

## Post-Deployment Configuration

### 1. Configure Redirects (Already in netlify.toml)
The `netlify.toml` file handles SPA routing automatically:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2. Configure Custom Domain (Optional)
1. Go to Domain management in Netlify
2. Add your custom domain
3. Update DNS records as instructed

### 3. Enable HTTPS
Netlify automatically provisions SSL certificates for custom domains.

---

## Troubleshooting

### Build Errors

**Error: "Cannot find module '@mui/material'"**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Error: "JavaScript heap out of memory"**
```bash
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Runtime Errors

**API calls failing**
- Verify `VITE_API_BASE_URL` environment variable
- Check CORS settings on backend
- Ensure backend URL is accessible from Netlify

**401 Unauthorized errors**
- Check authentication flow
- Verify JWT token handling
- Test with incognito mode

---

## Performance Optimization Features

The optimized build includes:

### 1. Code Splitting
- Lazy-loaded routes via `React.lazy()`
- Separate vendor chunks (React, MUI, Router)

### 2. Caching
- 1-year cache for assets
- API response cache (5-minute TTL)

### 3. Minification
- Terser for JavaScript
- esbuild for CSS
- Removed console logs in production

### 4. Tree Shaking
- Vite automatically removes unused code
- Optimized imports from MUI

---

## Monitoring

### 1. Netlify Dashboard
- Build logs
- Function logs
- Traffic analytics

### 2. Performance Monitoring
- Add Google Analytics
- Use Netlify's built-in analytics
- Consider Sentry for error tracking

---

## Rollback Procedure

If deployment fails:

1. **From Netlify Dashboard:**
   - Go to Deploys
   - Click "Rollback" on previous successful deploy

2. **From CLI:**
   ```bash
   netlify deploy --prod --id=DEPLOY_ID
   ```

---

## Security Headers (Already Configured)

The `netlify.toml` includes:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

---

## Estimated Build Time
- First build: ~2-5 minutes
- Subsequent builds: ~30-60 seconds (with cache)

---

## Support
- Netlify Docs: https://docs.netlify.com
- Vite Docs: https://vitejs.dev
- React Docs: https://react.dev
