import type { BillingWalletState } from "@/lib/billing";
import { buildWalletDisplaySummary } from "@shared/walletDisplay";

/** Older API responses only return wallet_credits + unlocked_photo_packs. */
export function normalizeBillingWalletPayload(
  raw: Record<string, unknown>,
): BillingWalletState {
  if (typeof raw.has_any_recharge === "boolean") {
    return raw as BillingWalletState;
  }

  const unlocked = Array.isArray(raw.unlocked_photo_packs)
    ? (raw.unlocked_photo_packs as string[]).filter(Boolean)
    : [];
  const walletCredits = Number(raw.wallet_credits ?? 0);
  const hasPhoto = unlocked.length > 0;
  const chatBalance = hasPhoto ? 0 : walletCredits;

  const summary = buildWalletDisplaySummary({
    chatBalance,
    unlockedPhotoPacks: unlocked,
    hasAnyPayment: hasPhoto || chatBalance > 0,
    hasChatRecharge: !hasPhoto && chatBalance > 0,
    photoPackCompanionIds: unlocked,
    voicePackCompanionIds: [],
  });

  return {
    ...summary,
    phone_number: (raw.phone_number as string | null) ?? null,
    name: (raw.name as string | null) ?? null,
  };
}

export function formatPackLines(wallet: BillingWalletState): string[] {
  const lines: string[] = [];
  if (wallet.has_chat_recharge) {
    lines.push(`Chat balance: ₹${wallet.chat_balance}`);
  }
  for (const p of wallet.photo_packs) {
    lines.push(`Photo Pack — ${p.display_name}: Paid`);
  }
  for (const p of wallet.voice_packs) {
    lines.push(`Voice Pack — ${p.display_name}: Paid`);
  }
  return lines;
}
