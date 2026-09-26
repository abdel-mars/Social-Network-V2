"use client";

import { useState, useEffect } from "react";
import { X, UserPlus } from "lucide-react";
import styles from "./inviteFriends.module.css";
import { API_URL, UPLOAD_URL } from "../../lib/api";

export default function InviteFriendsModal({ groupId, onClose, onInviteSent }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await fetch(`${API_URL}/Friends`, {
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

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 10) {
      if (visibleCount < filteredFriends.length) {
        setVisibleCount((prev) => prev + 5);
      }
    }
  };

  const toggleFriend = (friendId) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFriends.length === filteredFriends.length) {
      setSelectedFriends([]);
    } else {
      setSelectedFriends(filteredFriends.map(f => f.id));
    }
  };

  const handleInvite = async () => {
    if (selectedFriends.length === 0) {
      alert("Please select at least one friend");
      return;
    }

    setInviting(true);
    try {
      for (const friendId of selectedFriends) {
        await fetch(`${API_URL}/group/invite`, {
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
    `${f.full_name} ${f.username}`
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

        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(5);
              }}
              className={styles.searchInput}
            />
          </div>
          {filteredFriends.length > 0 && (
            <button className={styles.selectAllBtn} onClick={toggleSelectAll}>
              {selectedFriends.length === filteredFriends.length ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>

        <div className={styles.friendsList} onScroll={handleScroll}>
          {loading ? (
            <div className={styles.loadingState}>Loading friends...</div>
          ) : filteredFriends.length === 0 ? (
            <div className={styles.emptyState}>No friends found</div>
          ) : (
            filteredFriends.slice(0, visibleCount).map((friend) => {
              const isSelected = selectedFriends.includes(friend.id);
              return (
                <label key={friend.id} className={`${styles.friendItem} ${isSelected ? styles.selectedItem : ""}`}>
                  <div className={styles.friendLeft}>
                    <div className={styles.avatarWrapper}>
                      {friend.image_path ? (
                        <img src={`${UPLOAD_URL}/${friend.image_path}`} alt="" className={styles.avatar} />
                      ) : (
                        <div className={`${styles.avatarPlaceholder} ${friend.gender?.toLowerCase() === 'female' ? styles.female : ''}`}>
                          {friend.full_name?.[0] || friend.username?.[0] || "?"}
                        </div>
                      )}
                    </div>
                    <div className={styles.friendInfo}>
                      <div className={styles.friendName}>
                        {friend.full_name}
                      </div>
                      <div className={styles.friendUsername}>@{friend.username}</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFriend(friend.id)}
                    className={styles.checkbox}
                  />
                </label>
              );
            })
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
