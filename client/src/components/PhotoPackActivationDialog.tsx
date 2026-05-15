import { useEffect, useRef, useState } from "react";
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
  getStoredBillingPhoneDigits,
  normalizeIndianPhone,
  upsertAppProfileOnServer,
} from "@/lib/supabase";
import { Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { runRazorpayCheckout } from "@/lib/razorpay";

export const PHOTO_PACK_ACTIVATION_RUPEES = 29;

interface PhotoPackActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companionId: string;
  companionDisplayName: string;
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

export function PhotoPackActivationDialog({
  open,
  onOpenChange,
  companionId,
  companionDisplayName,
}: PhotoPackActivationDialogProps) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [phoneFieldError, setPhoneFieldError] = useState(false);
  const payInFlightRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const d = getStoredBillingPhoneDigits();
      setPhone(d ?? "");
      setPhoneFieldError(false);
    }
  }, [open]);

  const handleActivate = async () => {
    if (payInFlightRef.current || busy) return;
    const normalized = normalizeIndianPhone(phone);
    if (!normalized) {
      setPhoneFieldError(true);
      toast({
        title: "Invalid phone",
        description: "Enter a valid 10-digit Indian mobile number.",
        variant: "destructive",
      });
      return;
    }

    setPhoneFieldError(false);

    payInFlightRef.current = true;
    setBusy(true);
    const deviceId = getDeviceId();
    const name = guestDisplayName();

    try {
      await runRazorpayCheckout({
        amountRupees: PHOTO_PACK_ACTIVATION_RUPEES,
        prefill: { name, contact: normalized },
        billing: {
          device_id: deviceId,
          phone_number: normalized,
          product_type: "photo_pack",
          companion_id: companionId,
          rate_note: "Photo pack — 100 photos activation",
          metadata: {
            source: "photo_pack_activation",
            product_key: `${companionId}_100_photos`,
            companion_display_name: companionDisplayName,
            ui_language: localStorage.getItem("chatLanguage") || "hindi",
          },
        },
      });

      await upsertAppProfileOnServer(deviceId, {
        phone: normalized,
        name,
      }).catch(() => {});

      toast({
        title: "Activation successful",
        description: `${companionDisplayName} photo pack is now unlocked for your account.`,
      });
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment could not be completed";
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: msg.includes("cancelled")
          ? "Payment was cancelled."
          : msg,
      });
    } finally {
      payInFlightRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] gap-0 overflow-hidden border-0 p-0 shadow-xl">
        <div className="bg-gradient-to-b from-violet-100 via-purple-50 to-rose-100 px-6 pb-6 pt-8 text-center">
          <DialogHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-sm">
              <Lock className="h-7 w-7 text-slate-700" strokeWidth={1.75} />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              ₹{PHOTO_PACK_ACTIVATION_RUPEES} activation
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Unlock full access to {companionDisplayName}&apos;s photo collection (100+ photos and videos).
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-2 text-left">
            <Label
              htmlFor="photo-pack-phone"
              className={cn(phoneFieldError && "text-red-600")}
            >
              Mobile number
            </Label>
            <Input
              id="photo-pack-phone"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10-digit mobile number"
              value={phone}
              aria-invalid={phoneFieldError}
              onChange={(e) => {
                setPhoneFieldError(false);
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
              }}
              className={cn(
                "bg-white transition-colors",
                phoneFieldError &&
                  "border-2 border-red-500 ring-2 ring-red-200 focus-visible:border-red-500 focus-visible:ring-red-300",
              )}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          className="h-auto w-full gap-2 rounded-none bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 py-6 text-base font-semibold text-white shadow-md hover:bg-gradient-to-r hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-500 hover:text-white disabled:opacity-60"
          onClick={() => void handleActivate()}
        >
          <Sparkles className="h-5 w-5 text-amber-200" />
          {busy ? "Please wait…" : `Activate for ₹${PHOTO_PACK_ACTIVATION_RUPEES}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
