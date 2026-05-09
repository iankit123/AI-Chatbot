import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/Chat";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import OldChats from "./pages/OldChats";
import DoctorChat from "./pages/DoctorChat";
import KundliChat from "./pages/KundliChat";
import ParentingChat from "./pages/ParentingChat";
import FinanceChat from "./pages/FinanceChat";
import CareerChat from "./pages/CareerChat";
import KrishnaChat from "./pages/KrishnaChat";
import EnglishChat from "./pages/EnglishChat";
import AboutUs from "./pages/AboutUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import RefundPolicy from "./pages/RefundPolicy";
import ContactUs from "./pages/ContactUs";
import { ChatProvider } from "./context/ChatContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/old-chats" component={OldChats} />
      <Route path="/relationship-coach" component={LandingPage} />
      <Route path="/chat" component={Chat} />
      <Route path="/doctor" component={DoctorChat} />
      <Route path="/kundli" component={KundliChat} />
      <Route path="/parenting" component={ParentingChat} />
      <Route path="/finance" component={FinanceChat} />
      <Route path="/career" component={CareerChat} />
      <Route path="/krishna" component={KrishnaChat} />
      <Route path="/english" component={EnglishChat} />
      <Route path="/about" component={AboutUs} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsAndConditions} />
      <Route path="/refund" component={RefundPolicy} />
      <Route path="/contact" component={ContactUs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ChatProvider>
      <Router />
    </ChatProvider>
  );
}

export default App;
