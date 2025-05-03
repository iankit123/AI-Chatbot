#!/bin/bash
set -e

# Install dependencies
npm install

# Build the client and server
npm run build

echo "Build completed successfully" 