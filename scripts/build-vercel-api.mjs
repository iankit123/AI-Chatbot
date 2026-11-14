/**
 * Bundle server + Express handler into api/index.js for Vercel Node ESM.
 * Without this, api/index imports ../server/routes with no extension → ERR_MODULE_NOT_FOUND on Lambda.
 */
import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/**
 * npm packages stay external (Vercel ships node_modules), except the ones listed here, which
 * are compiled into api/index.js. astronomy-engine must be bundled: at runtime Node picks its
 * ES-module file, the package is not marked "type": "module", and on Vercel that load fails and
 * takes the whole API function down.
 */
const BUNDLED = ["astronomy-engine"];

function bundleOnly(bundled) {
  return {
    name: "external-packages-except",
    setup(build) {
      // Bare specifiers only ("express", "@supabase/x"); relative paths and tsconfig aliases pass through.
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        if (args.path.startsWith("@shared/") || args.path.startsWith("@/")) return null;
        if (bundled.some((name) => args.path === name || args.path.startsWith(`${name}/`))) return null;
        return { path: args.path, external: true };
      });
    },
  };
}

await esbuild.build({
  entryPoints: [path.join(root, "server/vercel-express.ts")],
  outfile: path.join(root, "api/index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  plugins: [bundleOnly(BUNDLED)],
  logLevel: "info",
});
