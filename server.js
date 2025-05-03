// This file is used by Vercel to serve the application
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Export the server for Vercel
export default async function server(req, res) {
  console.log(`[Vercel] Received request for: ${req.url}`);
  
  // Check if this is an API request
  if (req.url.startsWith('/api/')) {
    try {
      // Import the API handler
      const { default: handler } = await import('./dist/index.js');
      return handler(req, res);
    } catch (error) {
      console.error('Error loading API handler:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
      return;
    }
  }
  
  // For non-API requests, serve static files or index.html
  try {
    // Get the path to the index.html file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const indexPath = join(__dirname, 'dist', 'index.html');
    
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html');
      const content = fs.readFileSync(indexPath, 'utf8');
      res.end(content);
    } else {
      console.error('index.html not found at:', indexPath);
      res.statusCode = 404;
      res.end('Not found: index.html is missing');
    }
  } catch (error) {
    console.error('Error serving static content:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
} 