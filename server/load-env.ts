/**
 * Load repo-root `.env` before any other server module runs.
 *
 * Uses `dotenv.parse` + direct `process.env` assignment so secrets apply even when:
 * - the process was started with a cwd where `./.env` does not exist,
 * - `node --env-file` is unavailable or not used (e.g. plain `tsx server/index.ts`),
 * - the file has a UTF-8 BOM.
 */
import { config, parse } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function uniqueResolved(paths: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paths) {
    const abs = path.resolve(p);
    if (!seen.has(abs)) {
      seen.add(abs);
      out.push(abs);
    }
  }
  return out;
}

/** Prefer the first file that exists and parses to at least one entry. */
function candidateEnvPaths(): string[] {
  const list: string[] = [
    path.join(__dirname, "..", ".env"),
    path.join(process.cwd(), ".env"),
  ];
  const argv1 = process.argv[1];
  if (argv1) {
    const mainDir = path.dirname(path.resolve(argv1));
    list.push(path.join(mainDir, "..", ".env"), path.join(mainDir, ".env"));
  }
  return uniqueResolved(list);
}

function applyParsed(parsed: Record<string, string>, source: string): number {
  let count = 0;
  for (const [key, value] of Object.entries(parsed)) {
    if (value === undefined) continue;
    process.env[key] = value;
    count++;
  }
  if (count > 0) {
    console.log(`[load-env] Applied ${count} variables from ${source}`);
  }
  return count;
}

function loadEnvFile(absolutePath: string): boolean {
  if (!fs.existsSync(absolutePath)) return false;
  try {
    let raw = fs.readFileSync(absolutePath, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const parsed = parse(raw);
    const n = applyParsed(parsed, absolutePath);
    if (n === 0) return false;
    void config({ path: absolutePath, override: true });
    console.log(`[load-env] Primary env file: ${absolutePath}`);
    return true;
  } catch (err) {
    console.error(`[load-env] Failed reading ${absolutePath}:`, err);
    return false;
  }
}

let ok = false;
for (const p of candidateEnvPaths()) {
  if (loadEnvFile(p)) {
    ok = true;
    break;
  }
}

if (!ok) {
  console.warn("[load-env] No readable .env found. Tried:\n  " + candidateEnvPaths().join("\n  "));
}
