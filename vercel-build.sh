#!/bin/bash
set -e

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

echo "Build completed!" 