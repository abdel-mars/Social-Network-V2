"use client";

import { useState } from "react";
import { format } from "date-fns";
import styles from "./events.module.css";
import { Calendar, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";

export function EventsFeed({ events, setEvents }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!events || events.length === 0) return null;

  const handleRespond = async (eventId, responseType) => {
    try {
      const res = await fetch("http://localhost:8080/group-event/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ event_id: eventId, response: responseType }),
      });
      if (!res.ok) throw new Error("Failed to respond");

      setEvents((prev) =>
        prev.map((e) => {
          if (e.id === eventId) {
            let goingCount = e.going_count;
            let notGoingCount = e.not_going_count;
            if (e.user_response === "going") goingCount--;
            if (e.user_response === "not_going") notGoingCount--;

            if (responseType === "going") goingCount++;
            if (responseType === "not_going") notGoingCount++;

            return { ...e, user_response: responseType, going_count: goingCount, not_going_count: notGoingCount };
          }
          return e;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={styles.eventsContainer}>
      <div className={styles.sectionHeader} onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className={styles.sectionTitle}>
          <Calendar size={18}/> Upcoming Events ({events.length})
        </h3>
        <div className={styles.expandBtn}>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {isExpanded && (
        <div className={styles.eventList}>
          {events.map((e) => {
            const dateObj = new Date(e.event_date);
            const formattedDate = format(dateObj, "MMM d, yyyy • h:mm a");

            return (
              <div key={e.id} className={styles.eventCard}>
                <div className={styles.eventHeader}>
                  <div className={styles.eventDateBadge}>
                    <span className={styles.month}>{format(dateObj, "MMM")}</span>
                    <span className={styles.day}>{format(dateObj, "d")}</span>
                  </div>
                  <div className={styles.eventInfo}>
                    <h4 className={styles.eventTitle}>{e.title}</h4>
                    <div className={styles.eventMeta}>
                      <Calendar size={13} /> {formattedDate} • by {e.creator_name}
                    </div>
                  </div>
                </div>
                <p className={styles.eventDescription}>{e.description}</p>
                
                <div className={styles.eventActions}>
                  <div className={styles.actionButtons}>
                    <button 
                      className={`${styles.respondBtn} ${e.user_response === 'going' ? styles.activeGoing : ''}`}
                      onClick={() => handleRespond(e.id, "going")}
                    >
                      <CheckCircle2 size={16} /> Going ({e.going_count})
                    </button>
                    <button 
                      className={`${styles.respondBtn} ${e.user_response === 'not_going' ? styles.activeNotGoing : ''}`}
                      onClick={() => handleRespond(e.id, "not_going")}
                    >
                      <XCircle size={16} /> Not Going ({e.not_going_count})
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
