import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // First try to use the resolved dist path for client files
  let distPath = path.resolve(__dirname, "../dist/client");
  
  // If that doesn't exist, try other possible locations
  if (!fs.existsSync(distPath)) {
    distPath = path.resolve(__dirname, "../public");
    
    if (!fs.existsSync(distPath)) {
      distPath = path.resolve(__dirname, "public");
      
      if (!fs.existsSync(distPath)) {
        distPath = path.resolve(__dirname, "../dist");
        
        if (!fs.existsSync(distPath)) {
          throw new Error(
            `Could not find the build directory. Tried:
             - ${path.resolve(__dirname, "../dist/client")}
             - ${path.resolve(__dirname, "../public")}
             - ${path.resolve(__dirname, "public")}
             - ${path.resolve(__dirname, "../dist")}
             Make sure to build the client first.`
          );
        }
      }
    }
  }
  
  log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // Serve index.html for all routes for client-side routing
  app.get("*", (req, res) => {
    log(`Received request for: ${req.path}`);
    if (req.path.startsWith('/api')) {
      // Don't serve index.html for API routes
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    const indexPath = path.join(distPath, "index.html");
    log(`Serving index.html from: ${indexPath}`);
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      log(`Warning: index.html not found at ${indexPath}`);
      res.status(404).send('Not found: index.html is missing from build files');
    }
  });
}
