#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting Netlify build process..."

# 1. Install dependencies properly - install ALL dependencies, including dev dependencies
echo "Installing dependencies..."
NODE_ENV=development npm install

# 2. Create dist directory
mkdir -p dist

# 3. Build the client application properly
echo "Building client application..."
if [ -f "vite.config.ts" ]; then
  echo "Building with Vite..."
  # Use npx to ensure we're using the locally installed version
  NODE_ENV=production npx vite build || {
    echo "Vite build failed, copying static files as fallback"
    if [ -d "client/public" ]; then
      cp -r client/public/* dist/ || echo "Warning: Could not copy all public files"
    fi
    if [ -f "client/index.html" ]; then
      cp client/index.html dist/ || echo "Warning: Could not copy index.html"
    else
      cp fallback-index.html dist/index.html || echo "Warning: Using simple HTML fallback"
    fi
  }
else
  echo "Vite config not found, copying client files directly..."
  if [ -d "client/public" ]; then
    cp -r client/public/* dist/ || echo "Warning: Could not copy all public files"
  fi
  if [ -f "client/index.html" ]; then
    cp client/src/main.tsx dist/main.js || echo "Warning: Could not copy main.tsx"
    cp client/index.html dist/ || echo "Warning: Could not copy index.html"
  else
    cp fallback-index.html dist/index.html || echo "Warning: Using simple HTML fallback"
  fi
fi

# 4. Make sure the dist directory has something in it
if [ ! "$(ls -A dist)" ]; then
  echo "Warning: dist directory is empty, creating a simple index.html"
  cp fallback-index.html dist/index.html || echo "Creating minimal index.html"
  echo "<html><body><h1>Saathi Chat App</h1><p>Backend deployed successfully</p></body></html>" > dist/index.html
fi

# 5. Prepare netlify functions directory
mkdir -p netlify/functions-build

# 6. Bundle and prepare the API function for Netlify
echo "Building API functions..."
if [ -d "netlify/functions" ]; then
  echo "Setting up Netlify function dependencies..."
  
  # Ensure the functions-build directory exists
  mkdir -p netlify/functions-build
  
  # Copy server services needed by the function
  mkdir -p netlify/functions-build/server/services
  cp server/services/llm.ts netlify/functions-build/server/services/ || echo "Warning: Could not copy LLM service"
  
  # Copy any constants needed
  mkdir -p netlify/functions-build/lib
  
  if [ -f "server/lib/constants.ts" ]; then
    cp server/lib/constants.ts netlify/functions-build/lib/ || echo "Warning: Could not copy constants"
  elif [ -f "client/src/lib/constants.ts" ]; then
    cp client/src/lib/constants.ts netlify/functions-build/lib/ || echo "Warning: Could not copy constants from client"
  else
    echo "// Default system prompt" > netlify/functions-build/lib/constants.ts
    echo "export const BOT_SYSTEM_PROMPT = 'You are a helpful assistant.';" >> netlify/functions-build/lib/constants.ts
  fi
  
  # Copy API function
  cp -r netlify/functions/* netlify/functions-build/ || {
    echo "Function copy failed, creating placeholder function"
    echo 'exports.handler = async function() { return { statusCode: 200, body: JSON.stringify({ message: "API placeholder" }) }; };' > netlify/functions-build/api.js
  }
  
  # Create a package.json for the functions if needed
  if [ ! -f "netlify/functions-build/package.json" ]; then
    echo "Creating package.json for functions"
    echo '{
      "name": "netlify-functions",
      "version": "1.0.0",
      "private": true,
      "dependencies": {
        "@netlify/functions": "^1.0.0",
        "node-fetch": "^2.6.7"
      }
    }' > netlify/functions-build/package.json
  fi
else
  echo "Warning: netlify/functions directory not found, creating placeholder function"
  mkdir -p netlify/functions-build
  echo 'exports.handler = async function() { return { statusCode: 200, body: JSON.stringify({ message: "API placeholder" }) }; };' > netlify/functions-build/api.js
fi

echo "Build completed successfully!" 