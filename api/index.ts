import express from 'express';
import { registerRoutes } from '../server/routes';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Vercel can set req.url to `/api/index`; Express matches mounted routes using req.url.
app.use((req, _res, next) => {
  const orig = (req as { originalUrl?: string }).originalUrl;
  if (typeof orig === 'string' && orig.startsWith('/api')) {
    (req as { url: string }).url = orig;
  }
  next();
});

let initialized = false;

// Setup all routes
async function initialize() {
  if (initialized) return;
  
  await registerRoutes(app);
  initialized = true;
  
  console.log('[vercel] API handler initialized');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Initialize the app on first request
  await initialize();
  
  // Handle the request using the express app
  return new Promise((resolve, reject) => {
    const expressReq = req as any;
    const expressRes = res as any;
    
    // Add a callback to resolve the promise when the response is finished
    expressRes.on('finish', resolve);
    
    // Handle the request with Express
    app(expressReq, expressRes, (err: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      // If Express doesn't handle the request, resolve with a 404
      if (!expressRes.headersSent) {
        expressRes.status(404).json({ error: 'Not found' });
      }
      resolve(undefined);
    });
  });
} 