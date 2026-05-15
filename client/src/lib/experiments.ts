const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const parsePercent = (raw: string | undefined, fallback: number) => {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return clampPercent(Number.isFinite(n) ? n : fallback);
};

/**
 * Default rollout on Home per assistant card (0–100).
 * Keep every Home card here so percentages are obvious in one place.
 *
 * Override in `.env` with Vite vars, e.g.:
 *   VITE_HOME_CARD_DOCTOR_PERCENT=10
 *   VITE_HOME_CARD_FINANCE_PERCENT=10
 * Set to 100 to show everyone; 0 to hide for everyone.
 */
const HOME_CARD_DEFAULT_PERCENT: Record<string, number> = {
  doctor: 0,
  kundli: 100,
  parenting: 100,
  finance: 0,
  career: 100,
  relationship: 100,
  krishna: 100,
  english: 100,
};

const rolloutEnvKey = (roleId: string) =>
  `VITE_HOME_CARD_${roleId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_PERCENT` as const;

/**
 * Effective rollout percent for this role on Home (0–100).
 */
export const getHomeCardRolloutPercent = (roleId: string): number => {
  const fallback = HOME_CARD_DEFAULT_PERCENT[roleId] ?? 100; // unknown id → 100%
  const key = rolloutEnvKey(roleId);
  const fromEnv = import.meta.env[key] as string | undefined;
  return parsePercent(fromEnv, fallback);
};

const getOrCreateBucket = (experimentKey: string) => {
  const storageKey = `experiment_bucket_${experimentKey}`;
  const existing = localStorage.getItem(storageKey);
  if (existing !== null) {
    const parsed = Number(existing);
    if (Number.isFinite(parsed)) return parsed;
  }

  const bucket = Math.floor(Math.random() * 100);
  localStorage.setItem(storageKey, String(bucket));
  return bucket;
};

/**
 * Whether a Home assistant card should be shown for this browser (sticky via localStorage).
 */
export const isHomeAssistantCardVisible = (roleId: string) => {
  const percent = getHomeCardRolloutPercent(roleId);
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return getOrCreateBucket(`home_card_${roleId}`) < percent;
};

import {
  DEFAULT_RELATIONSHIP_GOOGLE_TTS_VOICE,
  normalizeRelationshipGoogleTtsVoice,
} from "./relationshipGoogleTtsVoices";

/**
 * Relationship voice chat defaults.
 * You can override with:
 * - VITE_RELATIONSHIP_VOICE_NAME (must be one of `RELATIONSHIP_GOOGLE_TTS_VOICE_OPTIONS`; default hi-IN-Chirp3-HD-Zephyr)
 * - VITE_RELATIONSHIP_VOICE_RATE (0.5-2, browser fallback only)
 * - VITE_RELATIONSHIP_VOICE_PITCH (0-2, browser fallback only)
 */
const DEFAULT_RELATIONSHIP_VOICE_RATE = 1;
const DEFAULT_RELATIONSHIP_VOICE_PITCH = 1;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const parseNumberWithFallback = (raw: string | undefined, fallback: number) => {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getRelationshipVoiceName = (): string =>
  normalizeRelationshipGoogleTtsVoice(
    (import.meta.env.VITE_RELATIONSHIP_VOICE_NAME as string | undefined)?.trim(),
  );

/** Default Google TTS voice id for relationship Hindi assistant (re-export). */
export const getDefaultRelationshipGoogleTtsVoice = (): string => DEFAULT_RELATIONSHIP_GOOGLE_TTS_VOICE;

export const getRelationshipVoiceRate = (): number =>
  clamp(
    parseNumberWithFallback(
      import.meta.env.VITE_RELATIONSHIP_VOICE_RATE as string | undefined,
      DEFAULT_RELATIONSHIP_VOICE_RATE,
    ),
    0.5,
    2,
  );

export const getRelationshipVoicePitch = (): number =>
  clamp(
    parseNumberWithFallback(
      import.meta.env.VITE_RELATIONSHIP_VOICE_PITCH as string | undefined,
      DEFAULT_RELATIONSHIP_VOICE_PITCH,
    ),
    0,
    2,
  );
