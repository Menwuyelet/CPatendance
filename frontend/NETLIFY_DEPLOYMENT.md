# Netlify Deployment Guide

## Quick Start

1. **Install Netlify CLI** (optional, for local testing):
```bash
npm install -g netlify-cli
```

2. **Connect to Netlify**:
   - Push your code to GitHub/GitLab/Bitbucket
   - Visit [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Select your repository
   - Netlify auto-detects the build settings from `netlify.toml`

3. **Configure Environment Variables**:
   - Go to Site Settings → Build & Deploy → Environment
   - Add these variables:
     - `VITE_API_BASE_URL`: Your backend API URL (e.g., `https://api.yourdomain.com/api`)
     - `VITE_ENV`: Set to `production`
     - `NODE_VERSION`: `18` (optional, pre-configured in netlify.toml)

4. **Deploy**:
   - Push to your Git branch (usually `main`)
   - Netlify automatically builds and deploys

## Build Configuration

The `netlify.toml` file configures:
- **Build command**: `npm run build` (Vite build)
- **Publish directory**: `dist/` (Vite output)
- **API redirects**: Proxies `/api/*` calls to your backend
- **SPA routing**: Fallback to `/index.html` for React Router
- **Caching**: Long-term cache for assets, no cache for HTML

## Environment Variables

Create a `.env.production` file with:
```
VITE_API_BASE_URL=https://your-backend-url.com/api
VITE_ENV=production
```

## Local Testing

Test the Netlify build locally:
```bash
npm run build
netlify deploy --prod --dir=dist
```

Or preview without deploying:
```bash
npm run build
netlify deploy --dir=dist
```

## API Proxy Configuration

By default, all requests to `/api/*` are proxied to your backend. Edit `netlify.toml` to change the backend URL:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://your-actual-backend.com/api/:splat"
  status = 200
  force = true
```

## Troubleshooting

- **404 on routes**: React Router routes are handled by the SPA fallback redirect (already configured)
- **CORS errors**: Ensure your backend allows requests from `https://your-netlify-domain.netlify.app`
- **Environment variables not loading**: Check Netlify Site Settings > Build & Deploy > Environment
- **API calls failing**: Verify `VITE_API_BASE_URL` matches your backend URL

## Build Logs

View deployment logs in Netlify Dashboard:
- Site → Deploys → Select a deploy → View logs

## Custom Domain

- Go to Site Settings → Domain Management → Custom Domain
- Add your domain and follow the DNS instructions
