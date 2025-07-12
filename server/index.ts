import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Alllow all origins for simplicity in local dev. 
// In a production environment, you should restrict this to your frontend's domain.
app.use(cors({ origin: '*', credentials: true }));

// Explicitly handle preflight requests
app.options('*', (req, res) => {
  console.log('Preflight request received for:', req.originalUrl);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204); // Use 204 No Content for preflight responses
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only log essential parts of the response
      if (capturedJsonResponse) {
        if (path === "/api/messages") {
          // For messages, only log the latest message content and role
          const messages = [];
          if (capturedJsonResponse.userMessage) {
            messages.push({
              role: capturedJsonResponse.userMessage.role,
              content: capturedJsonResponse.userMessage.content.slice(0, 30) + "...",
              hasPhoto: !!capturedJsonResponse.userMessage.photoUrl,
              isPremium: capturedJsonResponse.userMessage.isPremium
            });
          }
          if (capturedJsonResponse.botMessage) {
            messages.push({
              role: capturedJsonResponse.botMessage.role,
              content: capturedJsonResponse.botMessage.content.slice(0, 30) + "...",
              hasPhoto: !!capturedJsonResponse.botMessage.photoUrl,
              isPremium: capturedJsonResponse.botMessage.isPremium
            });
          }
          logLine += ` :: ${JSON.stringify(messages)}`;
        } else {
          // For other endpoints, just indicate response size
          logLine += ` :: ${Object.keys(capturedJsonResponse).length} keys`;
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 65220 to match the frontend's expected port
  const port = 65220;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
