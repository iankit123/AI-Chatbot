import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/Chat";
import LandingPage from "./pages/LandingPage";
import { ChatProvider } from "./context/ChatContext";
import { ChatSettingsProvider } from "./context/ChatSettingsContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/chat" component={Chat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <ChatProvider>
            <Router />
          </ChatProvider>
        </TooltipProvider>
      </ChatSettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
