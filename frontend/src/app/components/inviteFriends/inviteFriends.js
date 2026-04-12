"use client";

import { useState, useEffect } from "react";
import { X, UserPlus } from "lucide-react";
import styles from "./inviteFriends.module.css";

export default function InviteFriendsModal({ groupId, onClose, onInviteSent }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await fetch("http://localhost:8080/Friends", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch friends");
        const data = await res.json();
        setFriends(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch friends:", err);
        setFriends([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, []);

  const toggleFriend = (friendId) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleInvite = async () => {
    if (selectedFriends.length === 0) {
      alert("Please select at least one friend");
      return;
    }

    setInviting(true);
    try {
      for (const friendId of selectedFriends) {
        await fetch("http://localhost:8080/group/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ group_id: Number(groupId), user_id: Number(friendId) }),
        });
      }
      onInviteSent();
      onClose();
    } catch (err) {
      console.error("Failed to send invites:", err);
      alert("Failed to send some invitations");
    } finally {
      setInviting(false);
    }
  };

  const filteredFriends = friends.filter((f) =>
    `${f.first_name} ${f.last_name} ${f.username}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <UserPlus size={20} /> Invite Friends to Group
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.friendsList}>
          {loading ? (
            <div className={styles.loadingState}>Loading friends...</div>
          ) : filteredFriends.length === 0 ? (
            <div className={styles.emptyState}>No friends found</div>
          ) : (
            filteredFriends.map((friend) => (
              <label key={friend.id} className={styles.friendItem}>
                <input
                  type="checkbox"
                  checked={selectedFriends.includes(friend.id)}
                  onChange={() => toggleFriend(friend.id)}
                  className={styles.checkbox}
                />
                <div className={styles.friendInfo}>
                  <div className={styles.friendName}>
                    {friend.first_name} {friend.last_name}
                  </div>
                  <div className={styles.friendUsername}>@{friend.username}</div>
                </div>
              </label>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={inviting}>
            Cancel
          </button>
          <button
            className={styles.inviteBtn}
            onClick={handleInvite}
            disabled={inviting || selectedFriends.length === 0}
          >
            {inviting ? "Sending..." : `Invite (${selectedFriends.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
