import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ChatSettingsProvider } from "./context/ChatSettingsContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ChatSettingsProvider>
      <TooltipProvider>
        <Toaster />
        <App />
      </TooltipProvider>
    </ChatSettingsProvider>
  </QueryClientProvider>
);
