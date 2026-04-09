"use client";

import { useState, useRef, useEffect } from "react";
import { useAccent } from "./ThemeContext";
import styles from "./AccentPicker.module.css";

const PRESETS = [
  { label: "WiiU Blue",    color: "#5b7cf6" },
  { label: "Purple",       color: "#9b59b6" },
  { label: "Teal",         color: "#1abc9c" },
  { label: "Coral",        color: "#e8594a" },
  { label: "Amber",        color: "#f39c12" },
  { label: "Green",        color: "#27ae60" },
  { label: "Pink",         color: "#e91e8c" },
  { label: "Sky",          color: "#0ea5e9" },
  { label: "Indigo",       color: "#6366f1" },
  { label: "Rose",         color: "#ef4444" },
];

export default function AccentPicker() {
  const { accentColor, setAccentColor } = useAccent();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className={styles.wrapper} ref={panelRef}>
      <button
        id="accent-picker-btn"
        className={styles.trigger}
        onClick={() => setOpen(!open)}
        title="Change accent color"
        style={{ "--current": accentColor }}
      >
        <span className={styles.swatch} style={{ background: accentColor }} />
      </button>

      {open && (
        <div className={styles.panel}>
          <p className={styles.panelLabel}>Accent Color</p>
          <div className={styles.grid}>
            {PRESETS.map((p) => (
              <button
                key={p.color}
                className={`${styles.preset} ${accentColor === p.color ? styles.active : ""}`}
                style={{ background: p.color }}
                title={p.label}
                onClick={() => {
                  setAccentColor(p.color);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <div className={styles.custom}>
            <label htmlFor="custom-accent" className={styles.customLabel}>Custom</label>
            <input
              id="custom-accent"
              type="color"
              className={styles.colorInput}
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
