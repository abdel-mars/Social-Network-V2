"use client";

import { AccentProvider, ThemeProvider } from "./components/ui/ThemeContext";
import { ChatProvider } from "./components/chat/ChatContext";
import { ChatPopup } from "./components/chat/ChatPopup";
import { NotificationsProvider } from "./components/notifications/NotificationsContext";

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AccentProvider>
        <NotificationsProvider>
          <ChatProvider>
            {children}
            <ChatPopup />
          </ChatProvider>
        </NotificationsProvider>
      </AccentProvider>
    </ThemeProvider>
  );
}
