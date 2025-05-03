#!/bin/bash
set -e

# Debug info
echo "Current directory: $(pwd)"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install esbuild globally if not present
npm install --no-save esbuild

# Build client with Vite
echo "Building client with Vite..."
NODE_ENV=development npx vite build

# Try to build server using direct esbuild path
echo "Building server with esbuild..."
if ! ./node_modules/.bin/esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist; then
  echo "Direct esbuild failed, trying with Node.js script..."
  # Fallback to Node.js script
  NODE_ENV=development node esbuild.mjs
fi

# Ensure index.html is in the dist folder at the root level
if [ ! -f "dist/index.html" ]; then
  echo "Copying index.html to dist folder..."
  cp dist/client/index.html dist/index.html
fi

# Ensure proper structure for Vercel
echo "Setting up files for Vercel deployment..."
mkdir -p dist/public
cp -r dist/client/* dist/public/ 2>/dev/null || :

echo "Build completed!"
ls -la dist 