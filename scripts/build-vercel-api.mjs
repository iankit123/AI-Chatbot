/**
 * Bundle server + Express handler into api/index.js for Vercel Node ESM.
 * Without this, api/index imports ../server/routes with no extension → ERR_MODULE_NOT_FOUND on Lambda.
 */
import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

await esbuild.build({
  entryPoints: [path.join(root, "server/vercel-express.ts")],
  outfile: path.join(root, "api/index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "external",
  logLevel: "info",
});
