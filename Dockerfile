# ==============================================================================
# AFTERLIGHT — Production Multi-Stage Dockerfile
# Combines React 19 Frontend + FastAPI Astronomical Scientific Backend
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets
# ------------------------------------------------------------------------------
FROM node:22-slim AS frontend-builder
WORKDIR /app

# Copy package manifests and install dependencies
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copy source code and build production bundle
COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Python Scientific Backend
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS production

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    ENVIRONMENT=production

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python scientific packages
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend application source code
COPY backend/ ./backend/
COPY run.py ./run.py
COPY src/assets/images/ ./src/assets/images/

# Copy built frontend production artifacts from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Create runtime data directory
RUN mkdir -p /app/backend/data /app/backend/data/cache

# Expose server port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start FastAPI application via Uvicorn
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

