import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

  // Support for Vercel and other environments
  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
