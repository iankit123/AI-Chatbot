#!/bin/bash

# Install dependencies
npm install

# Build the client
npm run build

# Make the script executable
chmod +x vercel-build.sh 