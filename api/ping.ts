/**
 * Minimal health check — uses raw Node response APIs (no Express).
 * Vercel's `ServerResponse` does not expose Express helpers like `res.status().json()`.
 */
export default function handler(
  _req: unknown,
  res: import("node:http").ServerResponse,
): void {
  const body = JSON.stringify({ ok: true, at: new Date().toISOString() });
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}
