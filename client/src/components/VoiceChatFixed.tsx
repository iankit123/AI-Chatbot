import { useChat } from "@/context/ChatContext";

export function VoiceChatFixed() {
  const { botName } = useChat();
  
  const handleRequestActivation = () => {
    try {
      // Record request in localStorage
      const requestData = {
        type: 'voice_chat',
        timestamp: new Date().toISOString(),
        amount: 99,
        companionId: botName.toLowerCase()
      };
      
      // Store in localStorage
      const paymentRequests = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
      paymentRequests.push(requestData);
      localStorage.setItem('paymentRequests', JSON.stringify(paymentRequests));
      
      // Show message
      alert("Technical Issue: Our payment system is currently down. Please check back after 30 minutes.");
    } catch (error) {
      console.error('Error processing request:', error);
    }
  };
  
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
            
            <h3 className="text-xl font-semibold mb-2">Voice Chat: Premium Feature</h3>
            <p className="text-gray-600 mb-5">
              Only for selected members at ₹99. Talk to {botName} and hear her sweet voice.
            </p>
            
            <div className="w-full space-y-3">
              <button 
                onClick={handleRequestActivation}
                className="w-full py-3 px-4 rounded-md text-white font-medium bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Request Activation • ₹99
              </button>
              
              <button 
                onClick={() => window.location.href = '/'}
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