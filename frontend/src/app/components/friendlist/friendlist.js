"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DynamicIcon } from "lucide-react/dynamic";
import style from "./friendlist.module.css"

export default function FriendsList() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/Friends", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setFriends(data);
      setVisible(true); // show after fetch
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleUpdate = () => {
      if (visible) {
        fetchFriends();
      }
    };
    window.addEventListener("followUpdated", handleUpdate);
    return () => window.removeEventListener("followUpdated", handleUpdate);
  }, [visible]);

  const toggleVisible = () => {
    if (visible) {
      setVisible(false);
    } else {
      fetchFriends();
    }
  };
  return (
    <div className={style.FriendBtnList}>
      {/* Toggle Button */}
      <button
        onClick={toggleVisible}
        disabled={loading}
        className={style.friendListButton}
      >
        {loading ? (
          <>
            <DynamicIcon name="clock" size={18} />
            Loading...
          </>
        ) : visible ? (
          <>
            <DynamicIcon name="chevron-up" size={18} />
            Hide Friends
          </>
        ) : (
          <>
            <DynamicIcon name="chevron-down" size={18} />
            Show Friends
          </>
        )}
      </button>

      {/* Friends Container */}
      {visible && (
        <div className={style.ListContainer}>
          {friends?.length > 0
            ? friends.map((friend) => (
              <div
                key={friend.id}
                onClick={() => {
                  router.push(`/profile?id=${friend.id}`);
                  setVisible(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px",
                  cursor: "pointer",
                  transition: "0.2s",
                }}
              >
                {friend.image_path ? (
                  <img
                    src={`http://localhost:8080/${friend.image_path}`}
                    alt="avatar"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "#ccc",
                    }}
                  />
                )}
                <div>
                  <p style={{ margin: 0, fontWeight: "bold" }}>
                    {friend.full_name}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.85em", color: "#666" }}>
                    @{friend.username}
                  </p>
                </div>
              </div>
            ))
            : !loading && <div className={style.EmptyFriends}><p>No friends found.</p></div>}
        </div>
      )}
    </div>
  );
}
