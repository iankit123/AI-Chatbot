import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/context/ChatContext";
import { Lock } from "lucide-react";
import {
  getDeviceId,
  getSelectedCompanionId,
  getStoredBillingPhoneDigits,
  logPaymentAttemptOnServer,
} from "@/lib/supabase";
import { VOICE_CHAT_ACTIVATION_RUPEES } from "@/lib/constants";

export function VoiceChat() {
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();
  const { botName } = useChat();
  const rupees = VOICE_CHAT_ACTIVATION_RUPEES;

  const handleRequestActivation = async () => {
    const phone = getStoredBillingPhoneDigits();
    if (!phone) {
      toast({
        title: "फ़ोन नंबर चाहिए",
        description:
          "वॉइस चैट एक्टिवेशन के लिए पहले प्रोफाइल में 10 अंकों का मोबाइल नंबर सेव करें।",
        variant: "destructive",
      });
      return;
    }

    setRequesting(true);
    const companionId = getSelectedCompanionId();

    const requestData = {
      type: "voice_chat" as const,
      timestamp: new Date().toISOString(),
      amount: rupees,
      companionId: companionId ?? botName,
      phone,
    };

    try {
      const saved = await logPaymentAttemptOnServer({
        device_id: getDeviceId(),
        phone_number: phone,
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
            "Your request could not be saved. Please try again after some time.",
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Request recorded",
          description: "We'll enable voice chat for you soon.",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Voice chat activation:", error);
      toast({
        title: "Technical Issue",
        description:
          "Our payment system is currently down. Please check back after 30 minutes.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[80vh]">
      <div className="w-full max-w-md mx-auto mt-4">
        <div className="bg-gray-100 p-6 rounded-xl shadow-md">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-gray-500" />
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-2 text-center">
            Voice Chat: Premium Feature
          </h3>
          <p className="text-gray-600 mb-6 text-center">
            Only for selected members at ₹{rupees}. Talk to {botName} and hear her
            sweet voice.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => void handleRequestActivation()}
              disabled={requesting}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {requesting ? "Processing..." : `Request Activation • ₹${rupees}`}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = "/")}
            >
              Go back to Chat
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-grow"></div>
    </div>
  );
}
