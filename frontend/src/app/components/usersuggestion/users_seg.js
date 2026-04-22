"use client";
import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import styles from "./users_seg.module.css";
import { FollowButton } from "../follow/FollowButton";

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState({});
  const [folloading, setFolloading] = useState({});

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("http://localhost:8080/users-sug", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(data);
        const init = {};
        data?.forEach((u) => { init[u.user_id] = u.follow_status || "not_following"; });
        setFollowing(init);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handleFollowToggle = async (user_id) => {
    try {
      setFolloading((prev) => ({ ...prev, [user_id]: true }));
      const res = await fetch("http://localhost:8080/toggle-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followed_id: user_id }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle follow");
      const data = await res.json();
      
      const newStatus = data.status === "pending" ? "pending" : data.status === "accepted" ? "following" : "not_following";
      
      if (data.following || data.status === "pending") {
        setUsers((prev) => prev.filter((u) => u.user_id !== user_id));
        window.dispatchEvent(new CustomEvent("followUpdated", { 
          detail: { followed_id: user_id, status: newStatus } 
        }));
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    } finally {
      setFolloading((prev) => ({ ...prev, [user_id]: false }));
    }
  };

  if (loading) return <p className={styles.loading}>Loading...</p>;

  return (
    <div className={styles.list}>
      {users?.length === 0 ? (
        <p className={styles.empty}>No suggestions available.</p>
      ) : (
        users?.map((u) => {
          const status = following[u.user_id];
          return (
            <div key={u.user_id} className={styles.userItem}>
              <img
                src={u.image_path ? `http://localhost:8080/${u.image_path}` : "/default-avatar.png"}
                alt={u.username}
                className={styles.avatar}
              />
              <div className={styles.info}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{u.username}</span>
                  {u.is_private && <Lock size={12} className={styles.lockIcon} />}
                </div>
                <span className={styles.fullName}>{u.full_name || ""}</span>
              </div>
              <FollowButton
                status={status || "not_following"}
                onToggle={() => handleFollowToggle(u.user_id)}
                loading={folloading[u.user_id]}
              />
            </div>
          );
        })
      )}
    </div>
  );
}