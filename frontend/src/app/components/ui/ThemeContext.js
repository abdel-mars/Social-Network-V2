"use client";

import { createContext, useContext, useState, useEffect } from "react";

/* ===========================
   ACCENT COLOR CONTEXT
   =========================== */
const AccentContext = createContext({
  accentColor: "#5b7cf6",
  setAccentColor: () => {},
});

export function AccentProvider({ children }) {
  const [accentColor, setAccentColorState] = useState("#5b7cf6");

  useEffect(() => {
    const saved = localStorage.getItem("accentColor");
    if (saved) {
      setAccentColorState(saved);
      applyAccent(saved);
    }
  }, []);

  const setAccentColor = (color) => {
    setAccentColorState(color);
    applyAccent(color);
    localStorage.setItem("accentColor", color);
  };

  return (
    <AccentContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </AccentContext.Provider>
  );
}

export function useAccent() {
  return useContext(AccentContext);
}

function applyAccent(hex) {
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-light", lighten(hex, 0.2));
  root.style.setProperty("--accent-dark", darken(hex, 0.15));
  root.style.setProperty("--accent-bg", hex + "1a");
  root.style.setProperty("--accent-bg-strong", hex + "30");
}

/* Simple lighten/darken helpers */
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function lighten(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function darken(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/* ===========================
   THEME (LIGHT / DARK) CONTEXT
   =========================== */
const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "light";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
