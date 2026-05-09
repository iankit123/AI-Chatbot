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
  normalizeIndianPhone,
  signInWithPhoneLocal,
  upsertAppProfileOnServer,
} from "@/lib/supabase";

export interface PhoneNameSignInFieldsProps {
  onSuccess: () => void;
  /** Prefill from guest profile when opening sign-in from account sheet. */
  defaultName?: string;
  defaultPhoneDigits?: string;
}

const PHONE_DIGIT_LIMIT = 10;

function sanitizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, PHONE_DIGIT_LIMIT);
}

/**
 * Name + phone form only — parent supplies Dialog chrome (avoids nested Radix dialogs).
 */
export function PhoneNameSignInFields({
  onSuccess,
  defaultName = "",
  defaultPhoneDigits = "",
}: PhoneNameSignInFieldsProps) {
  const [name, setName] = useState(defaultName);
  const [phoneDigits, setPhoneDigits] = useState(() =>
    sanitizePhoneDigits(defaultPhoneDigits ?? ""),
  );
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const onPhoneChange = (raw: string) => {
    setPhoneDigits(sanitizePhoneDigits(raw));
  };

  const handleSubmit = async () => {
    const normalized = normalizeIndianPhone(phoneDigits);
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }
    if (!normalized || phoneDigits.length !== PHONE_DIGIT_LIMIT) {
      toast({
        title: "Invalid phone",
        description: `Enter exactly ${PHONE_DIGIT_LIMIT} digits.`,
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      signInWithPhoneLocal(name.trim(), normalized);
      const deviceId = getDeviceId();
      void upsertAppProfileOnServer(deviceId, {
        phone: normalized,
        name: name.trim(),
      });

      (document.activeElement as HTMLElement | null)?.blur?.();

      toast({
        title: "Signed in",
        description: "You're signed in on this device.",
      });
      onSuccess();
    } catch (e) {
      toast({
        title: "Could not sign in",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="signin-name">Name</Label>
        <Input
          id="signin-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-phone">Phone number</Label>
        <Input
          id="signin-phone"
          inputMode="numeric"
          type="tel"
          autoComplete="tel"
          maxLength={PHONE_DIGIT_LIMIT}
          placeholder="9876543210"
          value={phoneDigits}
          onChange={(e) => onPhoneChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{PHONE_DIGIT_LIMIT} digits only</p>
      </div>
      <Button className="w-full" disabled={busy} onClick={() => void handleSubmit()}>
        {busy ? "Saving…" : "Continue"}
      </Button>
      <p className="text-xs text-center text-muted-foreground uppercase tracking-wide">
        Secure · No spam · No OTP
      </p>
    </div>
  );
}

interface PhoneNameSignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignedIn?: () => void;
}

export function PhoneNameSignInDialog({
  open,
  onOpenChange,
  onSignedIn,
}: PhoneNameSignInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>
            Enter your name and phone number. No OTP — we only use this to recognise you on your next visit.
          </DialogDescription>
        </DialogHeader>
        <PhoneNameSignInFields
          onSuccess={() => {
            onOpenChange(false);
            onSignedIn?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
