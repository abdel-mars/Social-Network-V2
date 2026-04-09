"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import styles from "./ImagePreview.module.css";

export function ImagePreview({ src, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setMounted(true);
    // Prevent background scrolling while previewing
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close Preview">
        <X size={24} />
      </button>

      <div className={styles.controls} onClick={(e) => e.stopPropagation()}>
        <button className={styles.controlBtn} onClick={() => setScale(s => Math.max(0.5, s - 0.25))}>
           <ZoomOut size={20} />
        </button>
        <button className={styles.controlBtn} onClick={() => setScale(1)}>
           Reset
        </button>
        <button className={styles.controlBtn} onClick={() => setScale(s => Math.min(3, s + 0.25))}>
           <ZoomIn size={20} />
        </button>
      </div>

      <div 
        className={styles.imageContainer} 
        onClick={(e) => e.stopPropagation()}
        style={{ transform: `scale(${scale})` }}
      >
        <img src={src} alt="Full screen preview" className={styles.image} />
      </div>
    </div>,
    document.body
  );
}
