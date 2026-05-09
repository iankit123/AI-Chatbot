import { useChat } from "@/context/ChatContext";
import { useToast } from "@/hooks/use-toast";
import {
  getDeviceId,
  getSelectedCompanionId,
  getStoredBillingPhoneDigits,
  logPaymentAttemptOnServer,
} from "@/lib/supabase";
import { VOICE_CHAT_ACTIVATION_RUPEES } from "@/lib/constants";

export function VoiceChatFixed() {
  const { botName } = useChat();
  const { toast } = useToast();

  const handleRequestActivation = async () => {
    const phone = getStoredBillingPhoneDigits();
    if (!phone) {
      toast({
        title: "फ़ोन नंबर चाहिए",
        description:
          "वॉइस चैट एक्टिवेशन के लिए पहले प्रोफाइल में 10 अंकों का मोबाइल नंबर सेव करें या फिर से साइन इन करें।",
        variant: "destructive",
      });
      return;
    }

    const companionId = getSelectedCompanionId();
    const requestData = {
      type: "voice_chat" as const,
      timestamp: new Date().toISOString(),
      amount: VOICE_CHAT_ACTIVATION_RUPEES,
      companionId: companionId ?? botName,
      phone,
    };

    try {
      const saved = await logPaymentAttemptOnServer({
        device_id: getDeviceId(),
        phone_number: phone,
        amount_rupees: VOICE_CHAT_ACTIVATION_RUPEES,
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
          title: "सेव नहीं हो सका",
          description: "कृपया कुछ देर बाद दोबारा कोशिश करें।",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "अनुरोध दर्ज हो गया",
        description: "जल्द ही वॉइस चैट एक्टिवेट करने की प्रक्रिया शुरू होगी।",
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
            <p className="text-gray-600 mb-5">
              Only for selected members at ₹{rupees}. Talk to {botName} and hear her
              sweet voice.
            </p>

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
