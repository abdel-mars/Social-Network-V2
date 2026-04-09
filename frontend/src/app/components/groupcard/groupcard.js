"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, ShieldCheck } from "lucide-react";
import styles from "./groupcard.module.css";

export default function GroupCard({ group, Clickable = true }) {
  const router = useRouter();
  const [joined, setJoined] = useState(group.joined || false);
  const [loading, setLoading] = useState(false);

  const handleCardClick = () => {
    if (Clickable) router.push(`/groups/${group.id}`);
  };

  const handleJoin = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ group_id: group.id }),
      });
      if (res.ok) {
        setJoined(true);
      }
    } catch (err) {
      console.error("Failed to join:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`${styles.card} ${Clickable ? styles.clickable : ""}`} 
      onClick={handleCardClick}
    >
      <div className={styles.cardHeader}>
        <div className={styles.iconWrapper}>
          <ShieldCheck size={24} />
        </div>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>{group.name}</h2>
          <div className={styles.privacyBadge}>
            {group.privacy === "Private" ? <Lock size={12} /> : <Globe size={12} />}
            <span>{group.privacy}</span>
          </div>
        </div>
      </div>

      <p className={styles.description}>{group.description}</p>

      <div className={styles.footer} onClick={(e) => e.stopPropagation()}>
        {joined ? (
          <button className={`${styles.joinBtn} ${styles.joined}`} disabled>
            Joined
          </button>
        ) : (
          <button 
            className={styles.joinBtn} 
            onClick={handleJoin}
            disabled={loading}
          >
            {loading ? "Joining..." : "Join Group"}
          </button>
        )}
      </div>
    </div>
  );
}