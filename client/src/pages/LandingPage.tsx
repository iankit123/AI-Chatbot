import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ProfileDialog } from "@/components/ProfileDialog";

interface CompanionProfile {
  id: string;
  name: string;
  age: number;
  description: string;
  descriptionHindi: string;
  imageUrl: string;
  status: "online" | "offline";
}

const companions: CompanionProfile[] = [
  {
    id: "priya",
    name: "Priya",
    age: 24,
    description: "Friendly and caring, loves deep conversations",
    descriptionHindi: "दोस्ताना और देखभाल करने वाली, गहरी बातचीत पसंद है",
    imageUrl: "/images/priya.png",
    status: "online"
  },
  {
    id: "ananya",
    name: "Ananya",
    age: 26,
    description: "Playful and flirty, always ready to listen",
    descriptionHindi: "मस्तीभरी और थोड़ी फ्लर्टी, हमेशा सुनने के लिए तैयार",
    imageUrl: "/images/ananya.png",
    status: "online"
  },
  {
    id: "meera",
    name: "Meera",
    age: 23,
    description: "Sweet and understanding, loves to talk about life",
    descriptionHindi: "मीठी और समझदार, जीवन के बारे में बात करना पसंद है",
    imageUrl: "/images/meera.png",
    status: "online"
  },
  {
    id: "riya",
    name: "Riya",
    age: 25,
    description: "Creative and thoughtful, enjoys deep conversations",
    descriptionHindi: "रचनात्मक और विचारशील, गहरी बातचीत में आनंद लेती है",
    imageUrl: "/images/riya.jpg", // Reusing image for now
    status: "offline"
  },
  {
    id: "neha",
    name: "Neha",
    age: 22,
    description: "Cheerful and supportive, great listener",
    descriptionHindi: "खुशमिजाज और सहायक, अच्छी श्रोता",
    imageUrl: "/images/neha.jpg", // Reusing image for now
    status: "offline"
  }
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState("");
  const [selectedName, setSelectedName] = useState("Priya");
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // Initialize from localStorage or set default
  useEffect(() => {
    try {
      const savedCompanion = localStorage.getItem('selectedCompanion');
      if (savedCompanion) {
        const companion = JSON.parse(savedCompanion);
        setSelectedId(companion.id);
        setSelectedName(companion.name);
      } else {
        // Default to the first companion
        setSelectedId(companions[0].id);
        setSelectedName(companions[0].name);
        
        // Save to localStorage
        localStorage.setItem('selectedCompanion', JSON.stringify({
          id: companions[0].id,
          name: companions[0].name,
          avatar: companions[0].imageUrl
        }));
      }
    } catch (error) {
      console.error('Error loading companion from localStorage:', error);
      
      // Fallback to default
      setSelectedId(companions[0].id);
      setSelectedName(companions[0].name);
    }
  }, []);

  const handleSelectCompanion = (companion: CompanionProfile) => {
    console.log(`[LandingPage] User selected ${companion.name} (${companion.id})`);
    
    // Create companion object with complete data
    const companionData = {
      id: companion.id,
      name: companion.name,
      avatar: companion.imageUrl
    };
    
    // Save directly to localStorage
    localStorage.setItem('selectedCompanion', JSON.stringify(companionData));
    console.log(`[LandingPage] Saved to localStorage:`, companionData);
    
    // Update local state
    setSelectedId(companion.id);
    setSelectedName(companion.name);
    
    // Dispatch a custom event for other components to react to
    // This is more reliable for same-window updates
    console.log(`[LandingPage] Dispatching companion-selected event`);
    window.dispatchEvent(new Event('companion-selected'));
    
    // Small delay to ensure event is processed before navigation
    setTimeout(() => {
      console.log(`[LandingPage] Navigating to chat with ${companion.name}`);
      setLocation("/chat");
    }, 100);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Nav Bar */}
      <nav className="fixed w-full top-0 bg-white shadow-sm z-50 px-4 py-3 flex justify-between items-center">
        <div className="text-2xl font-['Pacifico'] gradient-text">Saathi</div>
        <button 
          onClick={() => {
            // Use currently selected companion instead of always defaulting to first companion
            const companionToUse = companions.find(c => c.id === selectedId && c.status === "online") || companions[0];
            console.log(`[LandingPage] 'Try for Free' using companion:`, companionToUse);
            
            const companionData = {
              id: companionToUse.id,
              name: companionToUse.name,
              avatar: companionToUse.imageUrl
            };
            
            // Save to localStorage
            localStorage.setItem('selectedCompanion', JSON.stringify(companionData));
            console.log(`[LandingPage] Saved to localStorage:`, companionData);
            
            // Update local state for consistency
            setSelectedId(companionToUse.id);
            setSelectedName(companionToUse.name);
            
            // Dispatch custom event for other components
            console.log(`[LandingPage] Dispatching companion-selected event`);
            window.dispatchEvent(new Event('companion-selected'));
            
            // Small delay to ensure event is processed before navigation
            setTimeout(() => {
              console.log(`[LandingPage] Navigating to chat with ${companionToUse.name}`);
              setLocation("/chat");
            }, 100);
          }}
          className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-full font-medium text-sm cursor-pointer shadow-md hover:shadow-lg transition-all duration-300">
          Try for Free
        </button>
      </nav>

      {/* Main Content */}
      <main className="pt-16 pb-20 px-4">
        {/* Hero Section */}
        <section className="mt-6 text-center">
          <h1 className="text-2xl font-bold gradient-text">
            Make New Friends and 
          </h1>
          <h1 className="text-2xl font-bold gradient-text">
            Start Chatting
          </h1>
          <p className="text-gray-600 mt-2 text-sm">अपने खास दोस्त की तलाश करें</p>
        </section>

        {/* Companion Selection */}
        <section className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            {companions.map((companion) => (
              <div
                key={companion.id}
                className="companion-card bg-white rounded-xl shadow-md overflow-hidden"
              >
                <div className="relative h-80 overflow-hidden">
                  <img
                    src={companion.imageUrl}
                    alt={companion.name}
                    className={`w-full h-full object-cover object-center ${companion.status === "offline" ? "grayscale opacity-75" : ""}`}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${companion.status === "online" ? "bg-green-500" : "bg-gray-400"} mr-2`}></div>
                      <span className="text-white text-xs">{companion.status === "online" ? "Online Now" : "Offline"}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {companion.name}, {companion.age}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    {companion.description}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {companion.descriptionHindi}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <span className="bg-pink-100 text-primary text-xs px-2 py-1 rounded-full">
                      Hindi
                    </span>
                    <span className="bg-purple-100 text-secondary text-xs px-2 py-1 rounded-full">
                      English
                    </span>
                  </div>
                  {companion.status === "online" ? (
                    <button
                      onClick={() => handleSelectCompanion(companion)}
                      className="w-full mt-4 bg-white border border-primary text-primary py-2 rounded-full font-medium text-sm cursor-pointer hover:bg-primary hover:text-white transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      Chat Now
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full mt-4 bg-gray-100 border border-gray-300 text-gray-400 py-2 rounded-full font-medium text-sm cursor-not-allowed"
                    >
                      Currently Unavailable
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="mt-10 bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-center text-gray-800">
            Why Choose Our Companions
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-5">
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary">
                  <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
                  <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path>
                  <line x1="13" x2="13" y1="11" y2="16"></line>
                  <circle cx="9" cy="13" r=".5"></circle>
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-800">Chat in Hindi & English</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Communicate comfortably in your preferred language
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-secondary">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-800">Available 24/7</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Always there for you whenever you need someone to talk to
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-800">Understanding & Caring</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Companions who listen and respond with empathy
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-10 bg-gradient-to-r from-primary to-secondary rounded-xl p-6 text-center text-white">
          <h2 className="text-xl font-semibold">Start Your Free Chat Today</h2>
          <p className="mt-2 text-white/90 text-sm">
            No credit card required. Begin chatting instantly.
          </p>

          <div className="mt-4 flex justify-center">
            <div className="bg-white/20 rounded-full px-4 py-2 text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 21a8 8 0 0 0-16 0"></path>
                <circle cx="10" cy="8" r="5"></circle>
                <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"></path>
              </svg>
              <span>25,000+ active users</span>
            </div>
          </div>

          <button
            onClick={() => {
              // Use currently selected companion (from UI selection or default)
              const companionToUse = companions.find(c => c.id === selectedId && c.status === "online") || companions[0];
              const companionData = {
                id: companionToUse.id,
                name: companionToUse.name,
                avatar: companionToUse.imageUrl
              };
              localStorage.setItem('selectedCompanion', JSON.stringify(companionData));
              
              // Use both events for maximum compatibility
              window.dispatchEvent(new Event('companion-selected'));
              window.dispatchEvent(new Event('storage'));
              
              console.log(`Selected companion for CTA: ${companionToUse.name}`);
              
              setLocation("/chat");
            }}
            className="cta-button mt-6 text-base cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            Free Chat with {selectedName}
          </button>

          <p className="mt-4 text-xs text-white/80">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </section>
      </main>

      {/* Tab Bar */}
      <div className="fixed bottom-0 w-full bg-white shadow-lg border-t border-gray-200 px-2 py-2">
        <div className="grid grid-cols-2 gap-1">
          <a
            href="#"
            className="flex flex-col items-center justify-center py-1 cursor-pointer"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <span className="text-xs mt-1 text-primary font-medium">Home</span>
          </a>

          <a
            onClick={() => setShowProfileDialog(true)}
            className="flex flex-col items-center justify-center py-1 cursor-pointer"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span className="text-xs mt-1 text-gray-500">Profile</span>
          </a>
        </div>
      </div>
      
      {/* Profile Dialog */}
      <ProfileDialog 
        open={showProfileDialog} 
        onOpenChange={setShowProfileDialog}
      />
    </div>
  );
}