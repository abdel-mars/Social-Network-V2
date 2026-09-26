"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import styles from "./friendlist.module.css";
import { API_URL, UPLOAD_URL } from "../../lib/api";

export default function FriendsList() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);
  const router = useRouter();
  const listRef = useRef(null);

  // Fetch immediately on mount
  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/Friends`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setFriends(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleUpdate = () => fetchFriends();
    window.addEventListener("followUpdated", handleUpdate);
    return () => window.removeEventListener("followUpdated", handleUpdate);
  }, []);

  // Compute filtered friends based on search term
  const filteredFriends = useMemo(() => {
    if (!searchTerm) return friends;
    const lowerQ = searchTerm.toLowerCase();
    return friends.filter(
      (f) =>
        f.username?.toLowerCase().includes(lowerQ) ||
        f.full_name?.toLowerCase().includes(lowerQ)
    );
  }, [friends, searchTerm]);

  // Handle scrolling threshold
  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    
    // If scrolled near bottom (within 10px), show 5 more!
    if (scrollHeight - scrollTop <= clientHeight + 10) {
      if (visibleCount < filteredFriends.length) {
        setVisibleCount((prev) => prev + 5);
      }
    }
  };

  const currentVisible = filteredFriends.slice(0, visibleCount);

  return (
    <div className={styles.wrapper}>
      {/* Search Input */}
      <div className={styles.searchContainer}>
        <Search size={14} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search friends..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setVisibleCount(5); // Reset visible count when searching
          }}
        />
      </div>

      <div 
        className={styles.list} 
        onScroll={handleScroll}
        ref={listRef}
      >
        {loading ? (
          <p className={styles.empty}>Loading friends...</p>
        ) : filteredFriends.length > 0 ? (
          <>
            {currentVisible.map((friend) => (
              <div
                key={friend.id}
                className={styles.friendItem}
                onClick={() => router.push(`/profile?id=${friend.id}`)}
              >
                <img 
                  src={friend.image_path ? `${UPLOAD_URL}/${friend.image_path}` : "/default-avatar.png"} 
                  alt="avatar" 
                  className={styles.avatar} 
                  onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
                />
                <div className={styles.info}>
                  <span className={styles.name}>{friend.full_name}</span>
                  <span className={styles.username}>@{friend.username}</span>
                </div>
              </div>
            ))}
          </>
        ) : (
          <p className={styles.empty}>
            {searchTerm ? "No friends match your search." : "No friends yet."}
          </p>
        )}
      </div>
    </div>
  );
}
