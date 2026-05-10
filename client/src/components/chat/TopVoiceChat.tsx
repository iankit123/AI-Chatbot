import { useEffect, useState } from "react";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getDeviceId,
  getSelectedCompanionId,
  getStoredBillingPhoneDigits,
  logPaymentAttemptOnServer,
  normalizeIndianPhone,
  notifyLocalAuthListeners,
  upsertAppProfileOnServer,
} from "@/lib/supabase";
import { VOICE_CHAT_ACTIVATION_RUPEES } from "@/lib/constants";
import { cn } from "@/lib/utils";

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

export function TopVoiceChat() {
  const { botName, currentLanguage } = useChat();
  const { toast } = useToast();
  const rupees = VOICE_CHAT_ACTIVATION_RUPEES;
  const [phone, setPhone] = useState("");
  const [phoneFieldError, setPhoneFieldError] = useState(false);

  useEffect(() => {
    setPhone(getStoredBillingPhoneDigits() ?? "");
    setPhoneFieldError(false);
  }, []);

  const phoneLabel =
    currentLanguage === "hindi" ? "मोबाइल नंबर" : "Mobile number";
  const phonePlaceholder =
    currentLanguage === "hindi" ? "10 अंकों का नंबर" : "10-digit mobile number";

  const handleRequestActivation = async () => {
    const normalized = normalizeIndianPhone(phone);
    if (!normalized) {
      setPhoneFieldError(true);
      toast({
        variant: "destructive",
        title:
          currentLanguage === "hindi"
            ? "गलत नंबर"
            : "Invalid phone number",
        description:
          currentLanguage === "hindi"
            ? "वैध 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें।"
            : "Enter a valid 10-digit Indian mobile number.",
      });
      return;
    }

    setPhoneFieldError(false);

    try {
      const raw = localStorage.getItem("guestProfile");
      const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      localStorage.setItem(
        "guestProfile",
        JSON.stringify({ ...prev, phone: normalized }),
      );
      notifyLocalAuthListeners();
    } catch {
      /* ignore */
    }

    const deviceId = getDeviceId();
    await upsertAppProfileOnServer(deviceId, {
      phone: normalized,
      name: guestDisplayName(),
    }).catch(() => {});

    const companionId = getSelectedCompanionId();
    const requestData = {
      type: "voice_chat" as const,
      timestamp: new Date().toISOString(),
      amount: rupees,
      companionId: companionId ?? botName,
      phone: normalized,
    };

    try {
      const saved = await logPaymentAttemptOnServer({
        device_id: deviceId,
        phone_number: normalized,
        amount_rupees: rupees,
        companion_id: companionId,
        rate_note: "Voice chat activation request",
        metadata: {
          source: "voice_chat_activation_request",
          product: "voice_chat",
          bot_display_name: botName,
          client_timestamp_iso: new Date().toISOString(),
        },
      });

      const paymentRequests = JSON.parse(
        localStorage.getItem("paymentRequests") || "[]",
      );
      paymentRequests.push(requestData);
      localStorage.setItem("paymentRequests", JSON.stringify(paymentRequests));

      if (!saved) {
        toast({
          title: "Technical Issue",
          description:
            "Your request could not be saved. Please try again after 30 minutes.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Request recorded",
        description: "We'll enable voice chat for you soon.",
      });
    } catch (error) {
      console.error("TopVoiceChat activation:", error);
      toast({
        title: "Technical Issue",
        description:
          "Our payment system is currently down. Please check back after 30 minutes.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-0 pt-0">
      <div className="bg-gray-100 rounded-lg max-w-sm mx-auto mt-5 shadow overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-center">
              Voice Chat: Premium Feature
            </h3>
            <p className="text-gray-600 text-center">
              Only for selected members at ₹{rupees}. Talk to {botName} and hear her
              sweet voice.
            </p>
          </div>

          <div className="w-full space-y-2 text-left">
            <Label
              htmlFor="top-voice-phone"
              className={cn(
                "text-slate-700",
                phoneFieldError && "text-red-600",
              )}
            >
              {phoneLabel}
            </Label>
            <Input
              id="top-voice-phone"
              inputMode="numeric"
              autoComplete="tel"
              placeholder={phonePlaceholder}
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

          <button
            type="button"
            onClick={() => void handleRequestActivation()}
            className="w-full py-2.5 px-4 rounded-md text-white font-medium bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            Request Activation • ₹{rupees}
          </button>

          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="w-full py-2 px-4 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Go back to Chat
          </button>
        </div>
      </div>
    </div>
  );
}
