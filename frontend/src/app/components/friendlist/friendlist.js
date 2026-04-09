"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import styles from "./friendlist.module.css";

export default function FriendsList() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/Friends", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setFriends(data);
      setVisible(true);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleUpdate = () => { if (visible) fetchFriends(); };
    window.addEventListener("followUpdated", handleUpdate);
    return () => window.removeEventListener("followUpdated", handleUpdate);
  }, [visible]);

  const toggleVisible = () => {
    if (visible) setVisible(false);
    else fetchFriends();
  };

  return (
    <div className={styles.wrapper}>
      <button id="friends-toggle-btn" onClick={toggleVisible} disabled={loading} className={styles.toggleBtn}>
        {loading ? <Clock size={15} /> : visible ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        <span>{loading ? "Loading..." : visible ? "Hide Friends" : "Show Friends"}</span>
      </button>

      {visible && (
        <div className={styles.list}>
          {friends?.length > 0 ? (
            friends.map((friend) => (
              <div
                key={friend.id}
                className={styles.friendItem}
                onClick={() => { router.push(`/profile?id=${friend.id}`); setVisible(false); }}
              >
                {friend.image_path ? (
                  <img src={`http://localhost:8080/${friend.image_path}`} alt="avatar" className={styles.avatar} />
                ) : (
                  <div className={styles.avatarFallback} />
                )}
                <div className={styles.info}>
                  <span className={styles.name}>{friend.full_name}</span>
                  <span className={styles.username}>@{friend.username}</span>
                </div>
              </div>
            ))
          ) : (
            !loading && <p className={styles.empty}>No friends yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
