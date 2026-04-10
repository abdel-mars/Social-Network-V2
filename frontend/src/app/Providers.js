"use client";

import { AccentProvider, ThemeProvider } from "./components/ui/ThemeContext";
import { ChatProvider } from "./components/chat/ChatContext";
import { ChatPopup } from "./components/chat/ChatPopup";

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AccentProvider>
        <ChatProvider>
          {children}
          <ChatPopup />
        </ChatProvider>
      </AccentProvider>
    </ThemeProvider>
  );
}
