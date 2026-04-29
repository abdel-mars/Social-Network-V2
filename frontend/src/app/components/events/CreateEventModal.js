"use client";

import { useState } from "react";
import { X } from "lucide-react";
import styles from "./events.module.css";

export function CreateEventModal({ isOpen, onClose, onCreate }) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isLoading) return;
    
    setIsLoading(true);
    
    const formData = new FormData(e.target);
    const day = formData.get("eventDay");
    const time = formData.get("eventTime");
    const eventDate = `${day}T${time}`;
    
    // Close modal immediately
    onClose();
    
    try {
      await onCreate({
        title: formData.get("title"),
        description: formData.get("description"),
        eventDate: eventDate,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create Event</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className={styles.formContainer}>
          <div className={styles.formGroup}>
            <label>Event Title</label>
            <input name="title" required placeholder="What's this event about?" className={styles.inputField} />
          </div>
          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea name="description" required placeholder="Provide details..." className={styles.textArea} />
          </div>
          <div className={styles.dateRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>Date</label>
              <input type="date" name="eventDay" required className={styles.inputField} />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>Time</label>
              <input type="time" name="eventTime" required className={styles.inputField} />
            </div>
          </div>
          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Event"}
          </button>
        </form>
      </div>
    </div>
  );
}
