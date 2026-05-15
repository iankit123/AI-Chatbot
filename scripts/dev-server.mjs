#!/usr/bin/env node
/**
 * Start the API + Vite dev server. Injects `.env` into the child process `env`
 * (read + parse here) so the API always sees SUPABASE_*, OPENROUTER_*, etc.,
 * even if `node --env-file` behaves differently across shells/IDEs.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { parse } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");
const entry = path.join(root, "server", "index.ts");

if (!fs.existsSync(envFile)) {
  console.error(`[dev-server] Missing env file: ${envFile}`);
  console.error("[dev-server] Create .env at the project root (next to package.json).");
  process.exit(1);
}

let raw = fs.readFileSync(envFile, "utf8");
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
const parsed = parse(raw);

const childEnv = { ...process.env, NODE_ENV: process.env.NODE_ENV || "development" };
for (const [k, v] of Object.entries(parsed)) {
  if (typeof v === "string") childEnv[k] = v;
}

const result = spawnSync(process.execPath, ["--import", "tsx", entry], {
  stdio: "inherit",
  cwd: root,
  env: childEnv,
});

process.exit(result.status === null ? 1 : result.status);
