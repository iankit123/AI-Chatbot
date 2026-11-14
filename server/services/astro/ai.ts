/** OpenRouter helpers for the astrology reports: narrative text, palm photo reading, partner sketch. */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const TEXT_MODELS = () => [
  process.env.ASTRO_TEXT_MODEL?.trim() || "google/gemini-2.5-flash",
  process.env.OPENROUTER_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.1-8b-instruct",
];
const VISION_MODELS = () => [process.env.ASTRO_VISION_MODEL?.trim() || "google/gemini-2.5-flash", "google/gemini-3.1-flash-lite", "openai/gpt-4o-mini"];
const IMAGE_MODELS = () => [process.env.ASTRO_IMAGE_MODEL?.trim() || "google/gemini-2.5-flash-image", "google/gemini-3.1-flash-lite-image"];

async function callOpenRouter(body: Record<string, unknown>, timeoutMs: number): Promise<any> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("OPENROUTER_API_KEY is missing");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://puchlo.in",
        "X-Title": "Puchlo.in",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Ask for a JSON object; tries each model in turn and returns null if all fail. */
export async function generateJson(
  system: string,
  user: string,
  maxTokens = 900,
): Promise<Record<string, unknown> | null> {
  for (const model of TEXT_MODELS()) {
    try {
      const data = await callOpenRouter(
        {
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        },
        14000,
      );
      const parsed = extractJson(String(data?.choices?.[0]?.message?.content ?? ""));
      if (parsed) return parsed;
      console.warn(`[astro-ai] ${model} returned unparseable JSON`);
    } catch (err) {
      console.warn(`[astro-ai] text model ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

export type PalmReading = { heart_line: string; marriage_line: string; fate_line: string; summary: string };

/** Reads a palm photo (data URL). Returns null when the image is not a palm or the model fails. */
export async function readPalm(imageDataUrl: string): Promise<PalmReading | null> {
  const prompt = `Tum ek anubhavi hast-rekha visheshagya ho. Is photo ko dekho.
Agar yeh insaan ki hatheli (palm) ki saaf photo NAHI hai to sirf {"is_palm": false} lautao.
Agar hatheli hai to jo rekhayein sach me dikh rahi hain unhi ke aadhar par, simple Hinglish (Roman lipi) me, vivah aur rishton par kendrit JSON do:
{"is_palm": true,
 "heart_line": "hriday rekha kaisi dikh rahi hai aur pyaar ke baare me kya batati hai (1-2 vakya)",
 "marriage_line": "vivah rekha (chhoti ungli ke neeche) kaisi hai, kitni, kitni gehri (1-2 vakya)",
 "fate_line": "bhagya rekha ka sanket (1 vakya)",
 "summary": "ek vakya ka nichod"}
Sambhavna ki bhasha use karo ("sanket deti hai"), pakka dava nahi. Sirf JSON.`;
  for (const model of VISION_MODELS()) {
    try {
      const data = await callOpenRouter(
        {
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
          temperature: 0.4,
          max_tokens: 500,
        },
        20000,
      );
      const parsed = extractJson(String(data?.choices?.[0]?.message?.content ?? ""));
      if (!parsed) continue;
      if (parsed.is_palm !== true) return null;
      const s = (k: string) => String(parsed[k] ?? "").trim().slice(0, 400);
      if (!s("heart_line") && !s("marriage_line")) return null;
      return { heart_line: s("heart_line"), marriage_line: s("marriage_line"), fate_line: s("fate_line"), summary: s("summary") };
    } catch (err) {
      console.warn(`[astro-ai] vision model ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

/** Generates an image and returns it as a data URL, or null when generation is unavailable. */
export async function generateImage(prompt: string): Promise<string | null> {
  for (const model of IMAGE_MODELS()) {
    try {
      const data = await callOpenRouter(
        { model, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] },
        55000,
      );
      const msg = data?.choices?.[0]?.message;
      const url: unknown = msg?.images?.[0]?.image_url?.url ?? msg?.images?.[0]?.url;
      if (typeof url === "string" && url.startsWith("data:image/")) return url;
      console.warn(`[astro-ai] image model ${model} returned no image`);
    } catch (err) {
      console.warn(`[astro-ai] image model ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}
