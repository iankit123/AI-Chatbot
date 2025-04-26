import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/Chat";
import { ChatProvider } from "@/context/ChatContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ChatProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ChatProvider>
  );
}

export default App;
