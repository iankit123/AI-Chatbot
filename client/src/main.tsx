import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ChatSettingsProvider } from "./context/ChatSettingsContext";
import { AuthProvider } from "./context/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { rememberMetaClickId } from "@/lib/metaClickIds";

rememberMetaClickId();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ChatSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <App />
        </TooltipProvider>
      </ChatSettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);
