# AFTERLIGHT Deployment Guide

This guide provides step-by-step instructions for deploying both the **React 19 Frontend** and the **FastAPI Scientific Backend**.

---

## Deployment Architectures

You have two main deployment options:

1. **Unified Full-Stack Deployment (Recommended)**:
   - Both the React frontend and FastAPI backend run in a single container or service.
   - The FastAPI server serves the scientific REST API on `/api/*`, interactive OpenAPI documentation on `/docs`, and the built React SPA frontend on `/`.
   - **Advantages**: Single URL, zero CORS configuration issues, $0 cost on free tiers (Render/Railway/Cloud Run).

2. **Split Deployment**:
   - Frontend deployed on **Vercel** or **Netlify**.
   - Backend deployed on **Render**, **Railway**, or **Fly.io**.
   - Connected via the `VITE_BACKEND_URL` environment variable.

---

## Method 1: 1-Click Unified Deployment on Render.com (Free Tier)

Render provides free hosting for Docker web services and is the simplest way to deploy AFTERLIGHT with zero configuration.

### Steps:
1. Push your code to a **GitHub** or **GitLab** repository:
   ```bash
   git init
   git add .
   git commit -m "Deploy AFTERLIGHT full stack"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/afterlight.git
   git push -u origin main
   ```
2. Log in to [Render.com](https://render.com) and click **New +** &rarr; **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your AFTERLIGHT repository.
4. Render will automatically detect the `render.yaml` or `Dockerfile`:
   - **Environment**: `Docker`
   - **Region**: Choose the closest region (e.g. `Oregon (US West)` or `Frankfurt (EU)`)
   - **Instance Type**: `Free`
5. Click **Create Web Service**.
6. Render builds the React bundle and starts the FastAPI server.
7. Once deployed, open your live URL (e.g. `https://afterlight.onrender.com`):
   - **Full React UI**: `https://afterlight.onrender.com`
   - **API Docs (Swagger)**: `https://afterlight.onrender.com/docs`
   - **Health Check**: `https://afterlight.onrender.com/api/health`

---

## Method 2: Unified Deployment on Railway

1. Install the Railway CLI or visit [railway.app](https://railway.app).
2. Click **New Project** &rarr; **Deploy from GitHub repo**.
3. Select your AFTERLIGHT repository.
4. Railway will automatically build using the included `Dockerfile`.
5. Under service **Settings** &rarr; **Networking**, click **Generate Domain**.
6. Your platform is live!

---

## Method 3: Split Deployment (Vercel Frontend + Render Backend)

### Step 3A: Deploy the Backend on Render or Railway
1. In Render, create a **Web Service** connecting your repository.
2. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Note your backend URL: e.g. `https://afterlight-api.onrender.com`.

### Step 3B: Deploy the Frontend on Vercel
1. Log in to [Vercel](https://vercel.com) and click **Add New** &rarr; **Project**.
2. Select your repository.
3. In **Environment Variables**, add:
   - **Key**: `VITE_BACKEND_URL`
   - **Value**: `https://afterlight-api.onrender.com` (your backend URL)
4. In `vercel.json`, ensure the `/api/(.*)` rewrite points to your backend URL:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "https://afterlight-api.onrender.com/api/$1"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
5. Click **Deploy**.

---

## Method 4: Docker Container Deployment (Self-Hosted / VPS / AWS / GCP)

### Build and Run with Docker Compose
```bash
# Build production image and run container
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop container
docker compose down
```

### Build and Run with Docker CLI
```bash
# Build image
docker build -t afterlight:latest .

# Run container
docker run -d -p 8000:8000 --name afterlight-app afterlight:latest

# Check health
curl http://localhost:8000/api/health
```

---

## Method 5: Run Production Build Locally

You can run the production build locally on your own machine without Docker:

```bash
# 1. Build the frontend production bundle
npm run build

# 2. Start the unified production server
python run.py
```
Open **`http://localhost:8000`** in your browser. Both the React application and the API are served on port 8000.

---

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Port for the backend server |
| `HOST` | `0.0.0.0` | Network binding interface |
| `ENVIRONMENT` | `production` | Deployment environment mode (`development` or `production`) |
| `LOG_LEVEL` | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `VITE_BACKEND_URL` | `http://127.0.0.1:8000` | Backend API base URL for the frontend |
| `BACKEND_URL` | `http://127.0.0.1:8000` | Gateway upstream proxy URL in `server.ts` |
| `DATABASE_PATH` | `backend/data/afterlight.db` | File path for persistent SQLite reviews |
| `UPSTREAM_TIMEOUT_SEC`| `4.5` | Timeout for external queries (CDS Sesame, IRSA TAP) |

