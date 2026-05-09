import { useState } from "react";
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
  logPaymentAttemptOnServer,
  normalizeIndianPhone,
  signInWithPhoneLocal,
  upsertAppProfileOnServer,
} from "@/lib/supabase";
import { ArrowRight, X } from "lucide-react";

const RATE_NOTE = "Approx. ₹5 per minute of chat";

const PACKS: { rupees: number; bonus: string; highlight?: boolean }[] = [
  { rupees: 10, bonus: "100% Extra" },
  { rupees: 50, bonus: "100% Extra" },
  { rupees: 100, bonus: "100% Extra", highlight: true },
  { rupees: 200, bonus: "50% Extra" },
  { rupees: 500, bonus: "50% Extra" },
  { rupees: 1000, bonus: "5% Extra" },
];

function getCompanionId(): string | null {
  try {
    const raw = localStorage.getItem("selectedCompanion");
    if (!raw) return null;
    return JSON.parse(raw)?.id ?? null;
  } catch {
    return null;
  }
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
  const { toast } = useToast();

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
    const companionId = getCompanionId();
    const name = guestDisplayName();

    try {
      await logPaymentAttemptOnServer({
        device_id: deviceId,
        phone_number: normalized,
        amount_rupees: selectedRupees,
        companion_id: companionId,
        rate_note: RATE_NOTE,
        metadata: { source: "chat_recharge_gate" },
      }).catch(() => {});
      signInWithPhoneLocal(name, normalized);
      await upsertAppProfileOnServer(deviceId, {
        phone: normalized,
        name,
      }).catch(() => {});
    } finally {
      setBusy(false);
    }

    toast({
      title: "Something went wrong",
      description: "Some technical error occurred. Please try again later.",
      variant: "destructive",
    });

    closeAfterSuccess();
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-pink-400 via-rose-500 to-orange-400 rounded-t-lg" />
        <button
          type="button"
          className="absolute right-3 top-5 rounded-sm opacity-70 hover:opacity-100 z-10"
          onClick={() => closeAfterDismiss()}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 pt-8">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Recharge to continue chat
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Chat usage is billed at about <span className="font-medium text-foreground">₹5 per minute</span>.
              Choose a top-up amount and confirm your number to continue.
            </DialogDescription>
          </DialogHeader>

          {step === "pick" ? (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Available balance</p>
                <p className="text-2xl font-semibold tabular-nums">₹ 0</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Popular recharge</p>
                <div className="grid grid-cols-2 gap-2">
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
                      className="flex-1"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98XXXXXXXX"
                      autoComplete="tel"
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
                  disabled={busy}
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
