#!/bin/bash
set -e

# Ensure esbuild is installed
echo "Installing esbuild..."
npm install --no-save esbuild

# Build the frontend with Vite
echo "Building frontend with Vite..."
npm run vite:build

# Build the server with esbuild (avoiding netlify-lambda)
echo "Building server with esbuild..."
./node_modules/.bin/esbuild server/vercel.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build completed successfully!" 