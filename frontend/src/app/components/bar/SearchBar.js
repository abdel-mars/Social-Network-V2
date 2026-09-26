"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import styles from "./searchbar.module.css";
import { API_URL, UPLOAD_URL } from "../../lib/api";

export default function SearchBar({ onMobileNav }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Debounced api fetch
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/search-users?q=${encodeURIComponent(query)}`, {
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error("User search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (userId) => {
    setIsOpen(false);
    setQuery("");
    if (onMobileNav) onMobileNav();
    router.push(`/profile?id=${userId}`);
  };

  return (
    <div className={styles.searchWrapper} ref={wrapperRef}>
      <div className={styles.inputContainer}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          className={`${styles.searchInput} ${(isOpen || query.trim()) ? styles.expanded : ""}`}
          placeholder="Search people..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
        />
      </div>

      {isOpen && query.trim() && (
        <div className={styles.dropdown}>
          {loading ? (
            <div className={styles.message}>Searching...</div>
          ) : results.length > 0 ? (
            results.map((user) => (
              <div 
                key={user.user_id} 
                className={styles.resultItem}
                onClick={() => handleSelect(user.user_id)}
              >
                <img
                  src={user.image_path ? `${UPLOAD_URL}/${user.image_path}` : "/default-avatar.png"}
                  alt={user.username}
                  className={styles.avatar}
                  onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
                />
                <div className={styles.userInfo}>
                  <span className={styles.fullName}>{user.full_name || user.username}</span>
                  <span className={styles.username}>@{user.username}</span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.message}>No users found.</div>
          )}
        </div>
      )}
    </div>
  );
}
