import { useEffect, useState } from "react";
import { WalletBalanceSummary } from "@/components/WalletBalanceSummary";
import { fetchBillingWallet, type BillingWalletState } from "@/lib/billing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  getDeviceId,
  normalizeIndianPhone,
  upsertAppProfileOnServer,
} from "@/lib/supabase";
import { ArrowRight } from "lucide-react";
import { ROLE_ADVISOR_COMPANION_IDS } from "@/lib/relationshipPhotoGallery";
import { runRazorpayCheckout } from "@/lib/razorpay";

const RATE_NOTE = "₹0.20 per message after free trial (₹1 = 5 msgs, ₹20 = 100 msgs)";

/** Until PSP confirms payment, user always sees this and stays behind the paywall. */
const PAYMENT_UX_ERROR =
  "Technical error in payment. Please try again in sometime.";

const PACKS: { rupees: number; bonus: string; highlight?: boolean }[] = [
  { rupees: 20, bonus: "100% Extra" },
  { rupees: 50, bonus: "100% Extra" },
  { rupees: 100, bonus: "100% Extra", highlight: true },
  { rupees: 200, bonus: "50% Extra" },
  // { rupees: 500, bonus: "50% Extra" },
  // { rupees: 1000, bonus: "5% Extra" },
];

function getCompanionContextForBilling(): {
  companionId: string | null;
  companionName: string | null;
  companionAvatar: string | null;
  chatSurface: "relationship_companion" | "role_advisor" | "unknown";
} {
  try {
    const raw = localStorage.getItem("selectedCompanion");
    if (!raw) {
      return {
        companionId: null,
        companionName: null,
        companionAvatar: null,
        chatSurface: "unknown",
      };
    }
    const c = JSON.parse(raw) as { id?: string; name?: string; avatar?: string };
    const id = c.id != null ? String(c.id) : null;
    const chatSurface: "relationship_companion" | "role_advisor" | "unknown" =
      !id ? "unknown" : ROLE_ADVISOR_COMPANION_IDS.has(id) ? "role_advisor" : "relationship_companion";
    return {
      companionId: id,
      companionName: c.name != null ? String(c.name) : null,
      companionAvatar: c.avatar != null ? String(c.avatar) : null,
      chatSurface,
    };
  } catch {
    return {
      companionId: null,
      companionName: null,
      companionAvatar: null,
      chatSurface: "unknown",
    };
  }
}

function getBillingMetadata(selectedRupees: number): Record<string, unknown> {
  const pack = PACKS.find((p) => p.rupees === selectedRupees);
  const ctx = getCompanionContextForBilling();
  let authUid: string | null = null;
  try {
    const au = localStorage.getItem("authUser");
    if (au) authUid = (JSON.parse(au) as { uid?: string }).uid ?? null;
  } catch {
    /* ignore */
  }

  return {
    source: "chat_recharge_gate",
    payment_integration: "razorpay",
    /** Filled after checkout success. */
    card_brand: null,
    card_last_four: null,
    payment_method: null,
    payment_capture_note:
      "App does not collect card/UPI yet; this row logs the chosen top-up pack and chat context only.",
    plan_amount_rupees: selectedRupees,
    plan_bonus_label: pack?.bonus ?? null,
    plan_was_highlight_recommended: pack?.highlight === true,
    chat_surface: ctx.chatSurface,
    companion_display_name: ctx.companionName,
    companion_avatar_token: ctx.companionAvatar,
    ui_language: typeof localStorage !== "undefined" ? localStorage.getItem("chatLanguage") || "hindi" : "hindi",
    guest_profile_name: guestDisplayName(),
    auth_uid_before_completion: authUid,
    client_timestamp_iso: new Date().toISOString(),
    user_agent:
      typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent : null,
  };
}

function guestDisplayName(): string {
  try {
    const raw = localStorage.getItem("guestProfile");
    if (!raw) return "User";
    const p = JSON.parse(raw) as { name?: string };
    return p.name?.trim() || "User";
  } catch {
    return "User";
  }
}

interface RechargeChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function RechargeChatDialog({ open, onOpenChange, onComplete }: RechargeChatDialogProps) {
  const [step, setStep] = useState<"pick" | "phone">("pick");
  const [selectedRupees, setSelectedRupees] = useState<number>(50);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [wallet, setWallet] = useState<BillingWalletState | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setWalletLoading(true);
    const timeout = window.setTimeout(() => {
      if (!cancelled) setWalletLoading(false);
    }, 15_000);

    void fetchBillingWallet()
      .then((w) => {
        if (!cancelled) setWallet(w);
      })
      .finally(() => {
        if (!cancelled) {
          window.clearTimeout(timeout);
          setWalletLoading(false);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open]);

  const resetLocal = () => {
    setStep("pick");
    setPhone("");
  };

  const closeAfterDismiss = () => {
    localStorage.setItem("recharge_dialog_dismissed", "true");
    resetLocal();
    onOpenChange(false);
  };

  const closeAfterSuccess = () => {
    localStorage.removeItem("recharge_dialog_dismissed");
    resetLocal();
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    closeAfterDismiss();
  };

  const runPaymentFlow = async () => {
    const normalized = normalizeIndianPhone(phone);
    if (!normalized) {
      toast({
        title: "Invalid phone",
        description: "Enter a valid 10-digit Indian mobile number.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    const deviceId = getDeviceId();
    const billingCtx = getCompanionContextForBilling();
    const name = guestDisplayName();

    try {
      const notes = {
        source: "chat_recharge_gate",
        device_id: deviceId,
        companion_id: billingCtx.companionId ?? "unknown",
        phone_number: normalized,
      };
      const paid = await runRazorpayCheckout({
        amountRupees: selectedRupees,
        name: "AI Chatbot",
        description: `Chat recharge ₹${selectedRupees}`,
        prefill: { name, contact: normalized },
        billing: {
          device_id: deviceId,
          phone_number: normalized,
          product_type: "chat_recharge",
          companion_id: billingCtx.companionId,
          rate_note: RATE_NOTE,
          metadata: getBillingMetadata(selectedRupees),
        },
        notes,
      });

      await upsertAppProfileOnServer(deviceId, {
        phone: normalized,
        name,
      }).catch(() => {});

      toast({
        title: "Payment successful",
        description: `Recharge activated. ${paid.billing.credits_allocated} credits added.`,
      });
      const refreshed = await fetchBillingWallet();
      if (refreshed) setWallet(refreshed);
      closeAfterSuccess();
      onComplete();
    } catch {
      toast({
        description: PAYMENT_UX_ERROR,
        variant: "destructive",
      });
      return;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-pink-400 via-rose-500 to-orange-400 rounded-t-lg" />

        <div className="p-6 pt-8">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Recharge to continue chat
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Chat is <span className="font-medium text-foreground">₹0.20 per message</span> after your free
              messages (₹20 ≈ 100 messages). Choose a top-up and confirm your number to continue.
            </DialogDescription>
          </DialogHeader>

          {step === "pick" ? (
            <div className="mt-6 space-y-4">
              <WalletBalanceSummary
                wallet={wallet}
                loading={walletLoading}
                companionId={getCompanionContextForBilling().companionId}
                companionName={getCompanionContextForBilling().companionName}
                onRecharge={(kind) => {
                  if (kind === "chat") {
                    document.getElementById("popular-recharge-grid")?.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                    });
                    return;
                  }
                  if (kind === "photo") {
                    toast({
                      title: "Photo pack",
                      description: "Open your companion’s Photos tab to unlock the photo pack.",
                    });
                    return;
                  }
                  toast({
                    title: "Voice chat",
                    description: "Use the Voice tab in chat to activate voice pack.",
                  });
                }}
              />
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Popular recharge</p>
                <div id="popular-recharge-grid" className="grid grid-cols-2 gap-2">
                  {PACKS.map((p) => (
                    <button
                      key={p.rupees}
                      type="button"
                      onClick={() => setSelectedRupees(p.rupees)}
                      className={`rounded-xl border bg-card text-left overflow-hidden transition-shadow ${
                        selectedRupees === p.rupees
                          ? "border-amber-400 ring-1 ring-amber-400/80 shadow-sm"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="relative px-3 py-2.5 bg-background">
                        {p.highlight ? (
                          <span className="absolute right-1 top-1 rounded bg-orange-500 px-1 py-0.5 text-[10px] font-medium text-white leading-none">
                            ★ Popular
                          </span>
                        ) : null}
                        <span className="text-base font-semibold tabular-nums">₹ {p.rupees}</span>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                        {p.bonus}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full gap-2" onClick={() => setStep("phone")}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-red-200 bg-background p-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="recharge-phone">Phone number</Label>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm tabular-nums shrink-0 px-2 py-2 rounded-md border bg-muted/40">
                      +91
                    </span>
                    <Input
                      id="recharge-phone"
                      inputMode="numeric"
                      type="tel"
                      maxLength={10}
                      pattern="\d{10}"
                      className="flex-1"
                      value={phone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setPhone(digits);
                      }}
                      placeholder="98XXXXXXXX"
                      autoComplete="tel-national"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  No OTP. No spam. 100% secure.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" type="button" onClick={() => setStep("pick")}>
                  Back
                </Button>
                <Button
                  className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                  disabled={busy || phone.length !== 10}
                  type="button"
                  onClick={() => void runPaymentFlow()}
                >
                  Pay ₹{selectedRupees}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
