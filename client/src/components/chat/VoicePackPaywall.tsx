import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VOICE_CHAT_ACTIVATION_RUPEES } from "@/lib/constants";
import { runRazorpayCheckout } from "@/lib/razorpay";
import {
  getDeviceId,
  normalizeIndianPhone,
  notifyLocalAuthListeners,
  upsertAppProfileOnServer,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";

type VoicePackPaywallProps = {
  companionId: string;
  onActivated: () => void;
};

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

export function VoicePackPaywall({ companionId, onActivated }: VoicePackPaywallProps) {
  const { botName, currentLanguage } = useChat();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [phoneFieldError, setPhoneFieldError] = useState(false);
  const [busy, setBusy] = useState(false);
  const rupees = VOICE_CHAT_ACTIVATION_RUPEES;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("guestProfile");
      if (raw) {
        const p = JSON.parse(raw) as { phone?: string };
        if (p.phone) setPhone(String(p.phone).replace(/\D/g, "").slice(-10));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleActivate = async () => {
    const normalized = normalizeIndianPhone(phone);
    if (!normalized) {
      setPhoneFieldError(true);
      toast({
        variant: "destructive",
        title: currentLanguage === "hindi" ? "गलत नंबर" : "Invalid phone",
        description:
          currentLanguage === "hindi"
            ? "वैध 10 अंकों का मोबाइल नंबर दर्ज करें।"
            : "Enter a valid 10-digit mobile number.",
      });
      return;
    }

    setPhoneFieldError(false);
    setBusy(true);
    const deviceId = getDeviceId();
    const name = guestDisplayName();

    try {
      const prev = localStorage.getItem("guestProfile");
      const profile = prev ? (JSON.parse(prev) as Record<string, unknown>) : {};
      localStorage.setItem("guestProfile", JSON.stringify({ ...profile, phone: normalized }));
      notifyLocalAuthListeners();
    } catch {
      /* ignore */
    }

    await upsertAppProfileOnServer(deviceId, { phone: normalized, name }).catch(() => {});

    try {
      await runRazorpayCheckout({
        amountRupees: rupees,
        prefill: { name, contact: normalized },
        billing: {
          device_id: deviceId,
          phone_number: normalized,
          product_type: "voice_chat",
          companion_id: companionId,
          rate_note: "Voice chat pack activation",
          metadata: {
            source: "voice_chat_activation",
            product: "voice_chat",
            companion_display_name: botName,
          },
        },
      });

      toast({
        title: currentLanguage === "hindi" ? "सक्रिय हो गया" : "Activated",
        description:
          currentLanguage === "hindi"
            ? `${botName} के साथ वॉइस चैट अब उपलब्ध है।`
            : `Voice chat with ${botName} is now unlocked.`,
      });
      onActivated();
    } catch {
      toast({
        variant: "destructive",
        description:
          currentLanguage === "hindi"
            ? "पेमेंट पूरी नहीं हुई। कृपया दोबारा कोशिश करें।"
            : "Payment was not completed. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center wa-chat-pattern px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-black/[0.08] bg-white p-6 shadow-lg text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
          <Lock className="h-8 w-8 text-neutral-500" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">
          {currentLanguage === "hindi" ? "वॉइस चैट — प्रीमियम" : "Voice Chat — Premium"}
        </h3>
        <p className="mt-2 text-sm text-neutral-600">
          {currentLanguage === "hindi"
            ? `${botName} की आवाज़ सुनने और बोलने के लिए ₹${rupees} में एक्टिवेट करें।`
            : `Unlock voice chat with ${botName} for ₹${rupees}.`}
        </p>

        <div className="mt-5 space-y-2 text-left">
          <Label htmlFor="voice-pack-phone" className={cn(phoneFieldError && "text-red-600")}>
            {currentLanguage === "hindi" ? "मोबाइल नंबर" : "Mobile number"}
          </Label>
          <div className="flex gap-2">
            <span className="flex h-10 items-center rounded-md border bg-muted/40 px-2 text-sm">+91</span>
            <Input
              id="voice-pack-phone"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => {
                setPhoneFieldError(false);
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
              }}
              className={cn(phoneFieldError && "border-red-500 ring-red-200")}
              placeholder="98XXXXXXXX"
            />
          </div>
        </div>

        <Button
          type="button"
          className="mt-5 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          disabled={busy || phone.length !== 10}
          onClick={() => void handleActivate()}
        >
          {busy
            ? currentLanguage === "hindi"
              ? "कृपया प्रतीक्षा करें…"
              : "Please wait…"
            : currentLanguage === "hindi"
              ? `₹${rupees} में एक्टिवेट करें`
              : `Activate for ₹${rupees}`}
        </Button>
      </div>
    </div>
  );
}