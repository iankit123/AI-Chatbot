#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting Netlify build process..."

# 1. Install dependencies properly
echo "Installing dependencies..."
npm ci

# 2. Create dist directory
mkdir -p dist

# 3. Copy index.html and static assets to dist
echo "Copying static assets..."
cp -r client/public/* dist/
cp client/index.html dist/

# 4. Bundle the server
echo "Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# 5. Bundle the functions
echo "Building functions..."
npx netlify-lambda build netlify/functions --config ./netlify-lambda-config.js

echo "Build completed successfully!" 