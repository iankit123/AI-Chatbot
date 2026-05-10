/**
 * Vercel serverless entry for Express — source for esbuild → api/index.js.
 * (Do not import this from server/index.ts; local dev uses server/index.ts only.)
 */
import express, { type NextFunction, type Request, type Response } from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  const orig = req.originalUrl;
  const cur = req.url ?? "";
  if (typeof orig === "string" && orig.startsWith("/api")) {
    req.url = orig;
  } else if ((!orig || orig === "") && typeof cur === "string" && cur.startsWith("/api")) {
    req.url = cur;
  }
  next();
});

let initialized = false;

async function initialize() {
  if (initialized) return;

  await registerRoutes(app, { createHttpServer: false });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[api] Express error middleware:", err);
    if (!res.headersSent) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "Internal server error", error: msg });
    }
  });

  initialized = true;
  console.log("[vercel] API handler initialized");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initialize();
  } catch (initErr) {
    console.error("[vercel] Init error:", initErr);
    const msg = initErr instanceof Error ? initErr.message : String(initErr);
    if (!res.headersSent) {
      const body = JSON.stringify({ message: "API failed to initialize", error: msg });
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(body);
    }
    return;
  }

  const expressReq = req as unknown as Request;
  const expressRes = res as unknown as Response;

  try {
    await new Promise<void>((resolve) => {
      let settled = false;
      const finishOnce = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      expressRes.on("finish", finishOnce);
      expressRes.on("close", finishOnce);

      app(expressReq, expressRes, (err: unknown) => {
        if (err) {
          console.error("[vercel] Express done(err):", err);
          if (!expressRes.headersSent) {
            const msg = err instanceof Error ? err.message : String(err);
            expressRes.status(500).json({ message: "Internal server error", error: msg });
          }
        } else if (!expressRes.headersSent) {
          expressRes.status(404).json({ error: "Not found" });
        }
        finishOnce();
      });
    });
  } catch (fatal) {
    console.error("[vercel] Dispatch fatal:", fatal);
    const msg = fatal instanceof Error ? fatal.message : String(fatal);
    if (!expressRes.headersSent) {
      const body = JSON.stringify({ message: "Internal server error", error: msg });
      expressRes.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      expressRes.end(body);
    }
  }
}
