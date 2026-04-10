"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "../../lib/time";
import { Search } from "lucide-react";
import style from "./chat.module.css";

export default function ConversationList({ conversations, setConversations, onSelect, selectedId, typingUsers = {} }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await fetch("http://localhost:8080/chat/conversations", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, [setConversations]);

  return (
    <aside className={style.conversationList}>
      <div className={style.listHeader}>
        <h3 className={style.headerTitle}>Messages</h3>
      </div>

      <div className={style.listItems}>
        {loading ? (
          <p className={style.empty}>Loading...</p>
        ) : conversations.length === 0 ? (
          <p className={style.empty}>No conversations yet.</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.user_id}
              className={`${style.convItem} ${selectedId === conv.user_id ? style.activeConv : ""}`}
              onClick={() => onSelect(conv)}
            >
              <div className={style.avatarWrapper}>
                <img
                  className={style.convAvatar}
                  src={conv.avatar ? `http://localhost:8080/${conv.avatar}` : "/default-avatar.png"}
                  alt={conv.username}
                  onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
                />
                {conv.is_online && <div className={style.onlineBadge} />}
              </div>

              <div className={style.convInfo}>
                <div className={style.convRow}>
                  <span className={style.username}>{conv.username}</span>
                  <span className={style.time}>
                    {conv.last_sent_at ? timeAgo(conv.last_sent_at) : ""}
                  </span>
                </div>
                {typingUsers[conv.user_id] ? (
                  <p className={style.typingText}>Typing...</p>
                ) : (
                  <p className={style.lastMsg}>{conv.last_message}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
