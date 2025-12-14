#!/bin/bash

# Configuration
# Replace these with your actual details or set them as environment variables
DOCKER_USERNAME="wasay2000"
BACKEND_IMAGE="tiktrack-backend"
FRONTEND_IMAGE="tiktrack-frontend"
BACKEND_URL="https://tiktrack-backend-latest.onrender.com" # From your logs

echo "🚀 Starting Deployment Build Process..."

# 1. Build & Push Backend
echo "--------------------------------------"
echo "📦 Building Backend (linux/amd64)..."
docker build --platform linux/amd64 -t $DOCKER_USERNAME/$BACKEND_IMAGE ./backend

echo "⬆️  Pushing Backend..."
docker push $DOCKER_USERNAME/$BACKEND_IMAGE

# 2. Build & Push Frontend (Requires Backend URL)
echo "--------------------------------------"
echo "📦 Building Frontend (linux/amd64)..."
echo "🔗 Linking to Backend API: $BACKEND_URL"

docker build --platform linux/amd64 \
  --build-arg VITE_API_URL=$BACKEND_URL \
  -t $DOCKER_USERNAME/$FRONTEND_IMAGE ./frontend

echo "⬆️  Pushing Frontend..."
docker push $DOCKER_USERNAME/$FRONTEND_IMAGE

echo "--------------------------------------"
echo "✅ Build & Push Complete!"
echo "👉 Go to Render Dashboard and deploy the latest image for both services."
