import { useChat } from "@/context/ChatContext";
import { useToast } from "@/hooks/use-toast";
import {
  getDeviceId,
  getSelectedCompanionId,
  getStoredBillingPhoneDigits,
  logPaymentAttemptOnServer,
} from "@/lib/supabase";
import { VOICE_CHAT_ACTIVATION_RUPEES } from "@/lib/constants";

export function TopVoiceChat() {
  const { botName } = useChat();
  const { toast } = useToast();
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
