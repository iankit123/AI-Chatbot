import type { ReactNode } from "react";
import type { BillingWalletState } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { companionDisplayName } from "@shared/walletDisplay";

export type WalletRechargeKind = "chat" | "voice" | "photo";

type WalletBalanceSummaryProps = {
  wallet: BillingWalletState | null;
  loading?: boolean;
  variant?: "default" | "compact";
  companionId?: string | null;
  companionName?: string | null;
  onRecharge?: (kind: WalletRechargeKind) => void;
};

function formatRupees(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "₹ 0";
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? `₹ ${rounded}` : `₹ ${rounded.toFixed(2)}`;
}

function hasAnyPlan(wallet: BillingWalletState): boolean {
  return (
    wallet.has_any_recharge ||
    wallet.photo_packs.length > 0 ||
    wallet.voice_packs.length > 0 ||
    wallet.unlocked_photo_packs.length > 0 ||
    wallet.has_chat_recharge
  );
}

function photoPackActive(wallet: BillingWalletState, companionId: string): boolean {
  const id = companionId.toLowerCase();
  return (
    wallet.photo_packs.some((p) => p.companion_id === id) ||
    wallet.unlocked_photo_packs.some((p) => p.toLowerCase() === id)
  );
}

function voicePackActive(wallet: BillingWalletState, companionId: string): boolean {
  const id = companionId.toLowerCase();
  return wallet.voice_packs.some((p) => p.companion_id === id);
}

type PlanRow = {
  key: string;
  label: string;
  right: ReactNode;
};

export function WalletBalanceSummary({
  wallet,
  loading = false,
  variant = "default",
  companionId,
  companionName,
  onRecharge,
}: WalletBalanceSummaryProps) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Loading balance…
      </p>
    );
  }

  if (!wallet || !hasAnyPlan(wallet)) {
    return (
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">Available balance</p>
        <p
          className={
            variant === "default"
              ? "text-2xl font-semibold tabular-nums"
              : "text-sm font-semibold tabular-nums"
          }
        >
          ₹ 0
        </p>
      </div>
    );
  }

  const cid = (companionId || wallet.photo_packs[0]?.companion_id || "naina").toLowerCase();
  const cname =
    companionName?.trim() ||
    wallet.photo_packs.find((p) => p.companion_id === cid)?.display_name ||
    companionDisplayName(cid);

  const chatBalance = Math.max(0, wallet.chat_balance);
  const chatNeedsRecharge = chatBalance < 0.2;

  const rows: PlanRow[] = [
    {
      key: "chat",
      label: "Text chat balance",
      right: chatNeedsRecharge ? (
        <PlanRightRecharge
          amountLabel={formatRupees(chatBalance)}
          onRecharge={onRecharge ? () => onRecharge("chat") : undefined}
        />
      ) : (
        <span className="shrink-0 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
          {formatRupees(chatBalance)}
        </span>
      ),
    },
    {
      key: "voice",
      label: "Voice chat balance",
      right: voicePackActive(wallet, cid) ? (
        <span className="shrink-0 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          Paid
        </span>
      ) : (
        <PlanRightRecharge
          amountLabel="₹ 0"
          onRecharge={onRecharge ? () => onRecharge("voice") : undefined}
        />
      ),
    },
    {
      key: "photo",
      label: `Photo Pack — ${cname}`,
      right: photoPackActive(wallet, cid) ? (
        <span className="shrink-0 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          Paid
        </span>
      ) : (
        <PlanRightRecharge
          amountLabel="₹ 0"
          onRecharge={onRecharge ? () => onRecharge("photo") : undefined}
        />
      ),
    },
  ];

  return (
    <div className="space-y-2 rounded-xl border border-border/80 bg-muted/30 px-3 py-2.5">
      <p className="text-xs font-medium text-muted-foreground">Your purchases</p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 text-foreground">{row.label}</span>
            {row.right}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanRightRecharge({
  amountLabel,
  onRecharge,
}: {
  amountLabel: string;
  onRecharge?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-sm font-semibold tabular-nums text-muted-foreground">{amountLabel}</span>
      {onRecharge ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs font-medium"
          onClick={onRecharge}
        >
          Recharge
        </Button>
      ) : null}
    </div>
  );
}
