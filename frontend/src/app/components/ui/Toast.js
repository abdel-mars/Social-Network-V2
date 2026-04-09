"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import styles from "./toast.module.css";

export default function Toast({ message, type = "success", onClose, duration = 3000 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for transition
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`${styles.toast} ${styles[type]} ${visible ? styles.show : styles.hide}`}>
      <div className={styles.icon}>
        {type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      </div>
      <p className={styles.message}>{message}</p>
      <button className={styles.closeBtn} onClick={() => setVisible(false)}>
        <X size={16} />
      </button>
    </div>
  );
}
