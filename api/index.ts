import "express-async-errors";
import express, { type NextFunction, type Request, type Response } from "express";
import { registerRoutes } from "../server/routes";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));

// Vercel may omit originalUrl or set req.url to `/api/index`; Express matches routes using req.url.
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

  await registerRoutes(app);

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
    return res.status(500).json({ message: "API failed to initialize", error: msg });
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
      expressRes.status(500).json({ message: "Internal server error", error: msg });
    }
  }
}
