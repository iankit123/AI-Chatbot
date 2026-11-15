import { Switch, Route, useLocation } from "wouter";
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
import RelationshipAdviceChat from "./pages/RelationshipAdviceChat";
import AboutUs from "./pages/AboutUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import RefundPolicy from "./pages/RefundPolicy";
import ContactUs from "./pages/ContactUs";
import ShaadiReportPage from "./pages/ShaadiReport";
import MilanReportPage from "./pages/MilanReport";
import WapasReportPage from "./pages/WapasReport";
import BusinessReportPage from "./pages/BusinessReport";
import NaukriReportPage from "./pages/NaukriReport";
import { ChatProvider } from "./context/ChatContext";
import { SupportBlockedPage } from "@/components/SupportBlockedPage";
import { isSupportBlocked } from "@/lib/supportBlock";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/old-chats" component={OldChats} />
      <Route path="/relationship-coach" component={LandingPage} />
      <Route path="/relationship-advice" component={RelationshipAdviceChat} />
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

const REPORT_PAGES = ["/shaadi", "/milan", "/wapas", "/business", "/naukri"];

/** Paid report pages. They live outside ChatProvider, which would otherwise open an empty companion chat per visitor. */
function ReportRouter() {
  return (
    <Switch>
      <Route path="/shaadi" component={ShaadiReportPage} />
      <Route path="/shaadi/r/:id" component={ShaadiReportPage} />
      <Route path="/milan" component={MilanReportPage} />
      <Route path="/milan/r/:id" component={MilanReportPage} />
      <Route path="/wapas" component={WapasReportPage} />
      <Route path="/wapas/r/:id" component={WapasReportPage} />
      <Route path="/business" component={BusinessReportPage} />
      <Route path="/business/r/:id" component={BusinessReportPage} />
      <Route path="/naukri" component={NaukriReportPage} />
      <Route path="/naukri/r/:id" component={NaukriReportPage} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  if (isSupportBlocked()) return <SupportBlockedPage />;
  if (REPORT_PAGES.some((p) => location === p || location.startsWith(`${p}/`))) return <ReportRouter />;
  return (
    <ChatProvider>
      <Router />
    </ChatProvider>
  );
}

export default App;
