import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  getDeviceId,
  getStoredBillingPhoneDigits,
  normalizeIndianPhone,
  upsertAppProfileOnServer,
} from "@/lib/supabase";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  prepareRazorpayCheckout,
  runRazorpayCheckout,
  type RazorpayCheckoutPrepared,
} from "@/lib/razorpay";

export const PHOTO_PACK_ACTIVATION_RUPEES = 29;

function PaywallSparkle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("h-3.5 w-3.5 text-white/95", className)}
    >
      <path d="M12 2l1.4 5.6L19 9l-5.6 1.4L12 16l-1.4-5.6L5 9l5.6-1.4L12 2z" />
    </svg>
  );
}

function PaymentMethodsRow() {
  return (
    <div className="flex items-center justify-center gap-5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <span className="text-[15px] font-bold tracking-tight">
        <span className="text-[#4285F4]">G</span>
        <span className="text-[#34A853]">o</span>
        <span className="text-[#FBBC05]">o</span>
        <span className="text-[#4285F4]">g</span>
        <span className="text-[#34A853]">l</span>
        <span className="text-[#EA4335]">e</span>
        <span className="text-slate-800"> Pay</span>
      </span>
      <span className="text-[15px] font-bold text-[#5F259F]">PhonePe</span>
      <span className="flex items-center gap-0.5 text-[15px] font-bold">
        <span className="text-[#097939]">UPI</span>
      </span>
    </div>
  );
}

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
  const preparedCheckoutRef = useRef<Promise<RazorpayCheckoutPrepared | undefined> | null>(
    null,
  );
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const d = getStoredBillingPhoneDigits();
      setPhone(d ?? "");
      setPhoneFieldError(false);
    } else {
      preparedCheckoutRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const normalized = normalizeIndianPhone(phone);
    if (!normalized) {
      preparedCheckoutRef.current = null;
      return;
    }
    const deviceId = getDeviceId();
    const name = guestDisplayName();
    const timer = window.setTimeout(() => {
      preparedCheckoutRef.current = prepareRazorpayCheckout({
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
      }).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [open, phone, companionId, companionDisplayName]);

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

    const checkoutOptions = {
      amountRupees: PHOTO_PACK_ACTIVATION_RUPEES,
      prefill: { name, contact: normalized },
      onBeforeOpen: () => onOpenChange(false),
      billing: {
        device_id: deviceId,
        phone_number: normalized,
        product_type: "photo_pack" as const,
        companion_id: companionId,
        rate_note: "Photo pack — 100 photos activation",
        metadata: {
          source: "photo_pack_activation",
          product_key: `${companionId}_100_photos`,
          companion_display_name: companionDisplayName,
          ui_language: localStorage.getItem("chatLanguage") || "hindi",
        },
      },
    };

    try {
      let prepared: RazorpayCheckoutPrepared | undefined;
      const prefetch = preparedCheckoutRef.current;
      if (prefetch) {
        const result = await prefetch;
        if (result?.order?.key_id) prepared = result;
      }
      preparedCheckoutRef.current = null;

      await runRazorpayCheckout(checkoutOptions, prepared);

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
      <DialogContent className="gap-0 overflow-hidden border-0 bg-white p-0 shadow-xl sm:max-w-[380px]">
        <div className="px-6 pb-4 pt-8 text-center">
          <DialogHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm">
              <Lock className="h-7 w-7 text-slate-700" strokeWidth={1.75} />
            </div>
            <DialogTitle className="text-xl font-bold leading-snug text-slate-900">
              {companionDisplayName}&apos;s 120+ Photos Videos
              <br />
              Only ₹{PHOTO_PACK_ACTIVATION_RUPEES}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              {companionDisplayName}&apos;s ki 100+ photos and videos dekho
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

        <div className="border-t border-slate-100 bg-slate-50/80 px-5 pb-6 pt-5">
          <PaymentMethodsRow />

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleActivate()}
            className="relative mt-4 w-full overflow-hidden rounded-full bg-gradient-to-r from-[#9d174d] via-[#7e22ce] to-[#4338ca] px-5 py-4 text-center text-[15px] font-bold leading-snug text-white shadow-lg shadow-purple-600/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            <PaywallSparkle className="absolute left-5 top-2 opacity-90" />
            <PaywallSparkle className="absolute left-9 top-6 h-2.5 w-2.5 opacity-75" />
            <PaywallSparkle className="absolute bottom-2.5 right-7 h-3 w-3 opacity-85" />
            <span className="relative z-10">
              {busy
                ? "Please wait…"
                : `Activate for ₹${PHOTO_PACK_ACTIVATION_RUPEES} & View Now`}
            </span>
          </button>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-600">
            This is a one-time charge. Safe &amp; Secure UPI Payments.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
