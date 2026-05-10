import { useEffect, useState } from "react";
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
  logPaymentAttemptOnServer,
  normalizeIndianPhone,
  upsertAppProfileOnServer,
} from "@/lib/supabase";
import { Lock, Sparkles } from "lucide-react";

export const PHOTO_PACK_ACTIVATION_RUPEES = 299;

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
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const d = getStoredBillingPhoneDigits();
      setPhone(d ?? "");
    }
  }, [open]);

  const handleActivate = async () => {
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
    const name = guestDisplayName();

    let paymentLogged = false;
    try {
      paymentLogged = await logPaymentAttemptOnServer({
        device_id: deviceId,
        phone_number: normalized,
        amount_rupees: PHOTO_PACK_ACTIVATION_RUPEES,
        companion_id: companionId,
        rate_note: "Photo pack — 100 photos activation",
        metadata: {
          source: "photo_pack_activation",
          product_key: `${companionId}_100_photos`,
          companion_display_name: companionDisplayName,
          ui_language: localStorage.getItem("chatLanguage") || "hindi",
          client_timestamp_iso: new Date().toISOString(),
        },
      });

      await upsertAppProfileOnServer(deviceId, {
        phone: normalized,
        name,
      }).catch(() => {});
    } finally {
      setBusy(false);
      if (paymentLogged) {
        toast({
          title: "Activation recorded",
          description:
            "We've logged your ₹299 photo pack request. Complete payment when checkout is available.",
        });
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Could not save request",
          description: "Check your connection and try again.",
        });
      }
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
            <Label htmlFor="photo-pack-phone">Mobile number</Label>
            <Input
              id="photo-pack-phone"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="bg-white"
            />
          </div>
        </div>
        <Button
          type="button"
          disabled={busy}
          className="w-full gap-2 rounded-none bg-black py-6 text-base font-semibold text-white hover:bg-zinc-900"
          onClick={() => void handleActivate()}
        >
          <Sparkles className="h-5 w-5 text-amber-300" />
          {busy ? "Please wait…" : `Activate for ₹${PHOTO_PACK_ACTIVATION_RUPEES}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
