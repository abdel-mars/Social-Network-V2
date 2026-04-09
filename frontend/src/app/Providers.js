"use client";

import { AccentProvider, ThemeProvider } from "./components/ui/ThemeContext";

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AccentProvider>
        {children}
      </AccentProvider>
    </ThemeProvider>
  );
}
