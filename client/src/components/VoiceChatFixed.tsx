import { useEffect, useState } from "react";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getDeviceId,
  getSelectedCompanionId,
  getStoredBillingPhoneDigits,
  normalizeIndianPhone,
  notifyLocalAuthListeners,
  upsertAppProfileOnServer,
} from "@/lib/supabase";
import { VOICE_CHAT_ACTIVATION_RUPEES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { runRazorpayCheckout } from "@/lib/razorpay";

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

export function VoiceChatFixed() {
  const { botName, currentLanguage } = useChat();
  const { toast } = useToast();
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
      amount: VOICE_CHAT_ACTIVATION_RUPEES,
      companionId: companionId ?? botName,
      phone: normalized,
    };

    try {
      const notes = {
        source: "voice_chat_activation",
        device_id: deviceId,
        companion_id: companionId ?? "unknown",
        phone_number: normalized,
      };
      await runRazorpayCheckout({
        amountRupees: VOICE_CHAT_ACTIVATION_RUPEES,
        name: "AI Chatbot",
        description: `Voice chat activation ₹${VOICE_CHAT_ACTIVATION_RUPEES}`,
        prefill: { name: guestDisplayName(), contact: normalized },
        billing: {
          device_id: deviceId,
          phone_number: normalized,
          product_type: "voice_chat",
          companion_id: companionId,
          rate_note: "Voice chat activation request",
          metadata: {
            source: "voice_chat_activation_request",
            product: "voice_chat",
            bot_display_name: botName,
          },
        },
        notes,
      });

      const paymentRequests = JSON.parse(
        localStorage.getItem("paymentRequests") || "[]",
      );
      paymentRequests.push(requestData);
      localStorage.setItem("paymentRequests", JSON.stringify(paymentRequests));

      toast({
        title: "अनुरोध दर्ज हो गया",
        description: "पेमेंट सफल हुआ। वॉइस चैट एक्सेस सक्रिय है।",
      });
    } catch (error) {
      console.error("Voice activation request:", error);
      toast({
        title: "त्रुटि",
        description: "अनुरोध सेव नहीं हो सका। बाद में कोशिश करें।",
        variant: "destructive",
      });
    }
  };

  const rupees = VOICE_CHAT_ACTIVATION_RUPEES;

  return (
    <div className="fixed top-[125px] left-0 right-0 z-50">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-gray-100 rounded-lg shadow-lg p-5">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>

            <h3 className="text-xl font-semibold mb-2">
              Voice Chat: Premium Feature
            </h3>
            <p className="text-gray-600 mb-4">
              Only for selected members at ₹{rupees}. Talk to {botName} and hear her
              sweet voice.
            </p>

            <div className="mb-4 w-full space-y-2 text-left">
              <Label
                htmlFor="voice-chat-phone"
                className={cn(
                  "text-slate-700",
                  phoneFieldError && "text-red-600",
                )}
              >
                {phoneLabel}
              </Label>
              <Input
                id="voice-chat-phone"
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

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={() => void handleRequestActivation()}
                className="w-full py-3 px-4 rounded-md text-white font-medium bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
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
      </div>
    </div>
  );
}
