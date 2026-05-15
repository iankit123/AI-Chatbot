import { readFileSync } from "fs";
import { parse } from "dotenv";

const env = parse(readFileSync(".env", "utf8"));
const base = process.env.WALLET_TEST_URL || "http://localhost:65220";

for (const [k, v] of Object.entries(env)) {
  if (typeof v === "string") process.env[k] = v;
}

const deviceId = "anonymous-1778695533069-953231";
const phone = "7409234221";
const url = `${base}/api/billing/wallet?device_id=${encodeURIComponent(deviceId)}&phone_number=${phone}`;

console.log("GET", url);
const res = await fetch(url, { headers: { Accept: "application/json" } });
const text = await res.text();
console.log("status", res.status);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text.slice(0, 500));
}

const { getBillingState } = await import("../server/services/supabaseBilling.ts");
const direct = await getBillingState(deviceId, phone);
console.log("\ngetBillingState direct:");
console.log(JSON.stringify(direct, null, 2));
