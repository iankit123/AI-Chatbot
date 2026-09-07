/**
 * Payment distribution report: what are users actually paying for?
 *
 * Answers three questions over a recent window of successful payments:
 *   1. Product bucket  -> chat vs image vs audio
 *   2. Profile         -> which paying user (phone / device / name)
 *   3. Character       -> which companion or assistant (companion_id)
 *
 * Usage:
 *   node scripts/analyze-payments.mjs              # last 5 days, successful payments
 *   node scripts/analyze-payments.mjs --days 14
 *   node scripts/analyze-payments.mjs --days 5 --all-statuses
 *   node scripts/analyze-payments.mjs --json       # machine-readable output
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env if present).
 */
import { readFileSync, existsSync } from "fs";
import { parse } from "dotenv";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env")) {
  for (const [k, v] of Object.entries(parse(readFileSync(".env", "utf8")))) {
    if (typeof v === "string" && !process.env[k]) process.env[k] = v;
  }
}

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const DAYS = Number(value("days", 5));
const ALL_STATUSES = flag("all-statuses");
const AS_JSON = flag("json");

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (put them in .env or export them).",
  );
  process.exit(1);
}

/** product_type -> the bucket the question is really about. */
const BUCKET = {
  chat_recharge: "chat",
  voice_chat: "audio",
  photo_pack: "image",
  premium_photo: "image",
  other: "other",
};

/** companion_id -> display name + whether it is a romantic profile or an assistant character. */
const COMPANION = {
  naina: ["Naina", "profile"],
  priya: ["Priya", "profile"],
  ananya: ["Ananya", "profile"],
  meera: ["Meera", "profile"],
  riya: ["Riya", "profile"],
  neha: ["Neha", "profile"],
  krishna: ["Krishna", "character"],
  english: ["Learn English", "character"],
  doctor: ["Personal Doctor AI", "character"],
  kundli: ["Kundli Bhavishya Checker", "character"],
  relationship: ["Relationship Advice", "character"],
  "relationship-advice": ["Relationship Advice", "character"],
  finance: ["Personal Finance Help", "character"],
  career: ["Career and Job Helper", "character"],
  parenting: ["Parenting and Baby Care", "character"],
};

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

let query = supabase
  .from("payment_attempts")
  .select(
    "id, created_at, status, amount_rupees, product_type, companion_id, device_id, phone_number, rate_note, credits_allocated, gateway_payment_id",
  )
  .gte("created_at", since)
  .order("created_at", { ascending: false });
if (!ALL_STATUSES) query = query.eq("status", "success");

const { data: payments, error } = await query;
if (error) {
  console.error("Failed to read payment_attempts:", error.message);
  process.exit(1);
}

if (!payments.length) {
  console.log(`No ${ALL_STATUSES ? "" : "successful "}payments in the last ${DAYS} days.`);
  process.exit(0);
}

/** Names for the paying profiles, so the report is not just phone numbers. */
const deviceIds = [...new Set(payments.map((p) => p.device_id).filter(Boolean))];
const nameByDevice = new Map();
if (deviceIds.length) {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("device_id, phone_number, name, wallet_credits, wallet_spent")
    .in("device_id", deviceIds);
  for (const p of profiles ?? []) nameByDevice.set(p.device_id, p);
}

const rupees = (rows) => rows.reduce((sum, r) => sum + Number(r.amount_rupees || 0), 0);

const groupBy = (rows, keyFn) => {
  const out = new Map();
  for (const row of rows) {
    const key = keyFn(row) ?? "(unknown)";
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(row);
  }
  return [...out.entries()]
    .map(([key, items]) => ({
      key,
      count: items.length,
      revenue: rupees(items),
      items,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count);
};

const total = rupees(payments);
const pct = (n) => (total ? `${((n / total) * 100).toFixed(0)}%` : "0%");

const byBucket = groupBy(payments, (p) => BUCKET[p.product_type] ?? "other");
const byProduct = groupBy(payments, (p) => p.product_type);
const byCompanion = groupBy(payments, (p) => (p.companion_id || "").toLowerCase() || null);
const byProfile = groupBy(payments, (p) => p.phone_number || p.device_id);

if (AS_JSON) {
  const strip = (groups) => groups.map(({ key, count, revenue }) => ({ key, count, revenue }));
  console.log(
    JSON.stringify(
      {
        window_days: DAYS,
        statuses: ALL_STATUSES ? "all" : "success",
        payment_count: payments.length,
        total_rupees: total,
        by_bucket: strip(byBucket),
        by_product_type: strip(byProduct),
        by_companion: strip(byCompanion),
        by_profile: strip(byProfile),
        payments,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const line = (label, count, revenue) =>
  `  ${label.padEnd(34)} ${String(count).padStart(3)} payment(s)   ₹${revenue
    .toFixed(0)
    .padStart(6)}   ${pct(revenue).padStart(4)}`;

console.log(
  `\nPayments in the last ${DAYS} days (${ALL_STATUSES ? "all statuses" : "successful only"})`,
);
console.log(`Total: ${payments.length} payment(s), ₹${total.toFixed(0)}\n`);

console.log("WHAT THEY PAY FOR (chat / image / audio)");
for (const g of byBucket) console.log(line(g.key, g.count, g.revenue));

console.log("\nBY PRODUCT TYPE");
for (const g of byProduct) console.log(line(g.key, g.count, g.revenue));

console.log("\nBY PROFILE / CHARACTER (companion_id)");
for (const g of byCompanion) {
  const [name, kind] = COMPANION[g.key] ?? [g.key, "unknown"];
  console.log(line(`${name} (${kind})`, g.count, g.revenue));
}

console.log("\nBY PAYING USER");
for (const g of byProfile) {
  const sample = g.items[0];
  const profile = nameByDevice.get(sample.device_id);
  const label = `${profile?.name || "unnamed"} · ${g.key}`;
  console.log(line(label.slice(0, 34), g.count, g.revenue));
}

console.log("\nINDIVIDUAL PAYMENTS");
for (const p of payments) {
  const [name] = COMPANION[(p.companion_id || "").toLowerCase()] ?? [p.companion_id || "—"];
  console.log(
    `  ${p.created_at.slice(0, 16).replace("T", " ")}  ₹${String(
      Math.round(Number(p.amount_rupees)),
    ).padStart(5)}  ${(BUCKET[p.product_type] ?? "other").padEnd(6)} ${(
      p.product_type || ""
    ).padEnd(15)} ${String(name).padEnd(24)} ${p.phone_number || p.device_id}${
      ALL_STATUSES ? `  [${p.status}]` : ""
    }`,
  );
}
console.log();
