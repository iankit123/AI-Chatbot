import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/Chat";
import LandingPage from "./pages/LandingPage";
import { ChatProvider } from "./context/ChatContext";

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
    <ChatProvider>
      <Router />
    </ChatProvider>
  );
}

export default App;
