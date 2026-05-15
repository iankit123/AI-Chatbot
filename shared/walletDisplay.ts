export type PaidPackLine = {
  companion_id: string;
  display_name: string;
};

export type WalletDisplaySummary = {
  /** Net chat rupees remaining (after message debits). */
  wallet_credits: number;
  /** Header chip: 0 until user has a successful chat recharge. */
  display_balance: number;
  has_any_recharge: boolean;
  has_chat_recharge: boolean;
  chat_balance: number;
  unlocked_photo_packs: string[];
  photo_packs: PaidPackLine[];
  voice_packs: PaidPackLine[];
};

export function companionDisplayName(companionId: string): string {
  const id = companionId.trim().toLowerCase();
  if (!id) return "Companion";
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function buildWalletDisplaySummary(input: {
  chatBalance: number;
  unlockedPhotoPacks: string[];
  hasAnyPayment: boolean;
  hasChatRecharge: boolean;
  photoPackCompanionIds: string[];
  voicePackCompanionIds: string[];
}): WalletDisplaySummary {
  const photoIds = new Set<string>();
  for (const id of input.unlockedPhotoPacks) {
    if (id?.trim()) photoIds.add(id.trim().toLowerCase());
  }
  for (const id of input.photoPackCompanionIds) {
    if (id?.trim()) photoIds.add(id.trim().toLowerCase());
  }

  const voiceIds = new Set<string>();
  for (const id of input.voicePackCompanionIds) {
    if (id?.trim()) voiceIds.add(id.trim().toLowerCase());
  }

  const photo_packs = Array.from(photoIds).map((companion_id) => ({
    companion_id,
    display_name: companionDisplayName(companion_id),
  }));
  const voice_packs = Array.from(voiceIds).map((companion_id) => ({
    companion_id,
    display_name: companionDisplayName(companion_id),
  }));

  const has_any_recharge =
    input.hasAnyPayment || photo_packs.length > 0 || voice_packs.length > 0;

  const chat_balance = Math.max(0, input.chatBalance);
  const display_balance = input.hasChatRecharge ? chat_balance : 0;

  return {
    wallet_credits: chat_balance,
    display_balance,
    has_any_recharge,
    has_chat_recharge: input.hasChatRecharge,
    chat_balance,
    unlocked_photo_packs: Array.from(photoIds),
    photo_packs,
    voice_packs,
  };
}
