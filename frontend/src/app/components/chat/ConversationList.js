"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "../../lib/time";
import { Users, User, MessageSquare } from "lucide-react";
import { useChat } from "./ChatContext";
import style from "./chat.module.css";

export default function ConversationList({
  conversations,
  setConversations,
  onSelect,
  selectedId,
  typingUsers = {},
  activeTab,
  setActiveTab
}) {
  const [loading, setLoading] = useState(true);
  const { unreadCounts } = useChat();

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

  const filteredConversations = conversations.filter(conv =>
    activeTab === "groups" ? conv.group_id > 0 : !conv.group_id
  );

  const directUnread = Object.keys(unreadCounts)
    .filter(key => !key.toString().startsWith("group_"))
    .reduce((sum, key) => sum + unreadCounts[key], 0);

  const groupsUnread = Object.keys(unreadCounts)
    .filter(key => key.toString().startsWith("group_"))
    .reduce((sum, key) => sum + unreadCounts[key], 0);

  return (
    <aside className={style.conversationList}>
      <div className={style.listHeader}>
        <div className={style.titleRow}>
          <h3 className={style.headerTitle}>Messages</h3>
        </div>
        <div className={style.tabNav}>
          <button
            className={`${style.tabBtn} ${activeTab === "direct" ? style.activeTab : ""}`}
            onClick={() => setActiveTab("direct")}
          >
            <User size={16} />
            Directs
            {directUnread > 0 && (
              <span className={style.tabBadge}>
                {directUnread > 9 ? "+9" : directUnread}
              </span>
            )}
          </button>
          <button
            className={`${style.tabBtn} ${activeTab === "groups" ? style.activeTab : ""}`}
            onClick={() => setActiveTab("groups")}
          >
            <Users size={16} />
            Groups
            {groupsUnread > 0 && (
              <span className={style.tabBadge}>
                {groupsUnread > 9 ? "+9" : groupsUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className={style.listItems}>
        {loading ? (
          <p className={style.empty}>Loading...</p>
        ) : filteredConversations.length === 0 ? (
          <p className={style.empty}>
            {activeTab === "groups" ? "No group chats yet." : "No direct messages yet."}
          </p>
        ) : (
          filteredConversations.map((conv) => {
            const convId = conv.group_id ? `group_${conv.group_id}` : conv.user_id;
            const isSelected = selectedId === convId;
            const unreadCount = conv.group_id ? unreadCounts[`group_${conv.group_id}`] : unreadCounts[conv.user_id];

            return (
              <div
                key={convId}
                className={`${style.convItem} ${isSelected ? style.activeConv : ""}`}
                onClick={() => onSelect(conv)}
              >
                <div className={style.avatarWrapper}>
                  {conv.group_id ? (
                    <div className={style.groupAvatarPlaceholder}>
                      <Users size={20} />
                    </div>
                  ) : (
                    <img
                      className={style.convAvatar}
                      src={conv.avatar ? `http://localhost:8080/${conv.avatar}` : "/default-avatar.png"}
                      alt={conv.username}
                      onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
                    />
                  )}
                  {!conv.group_id && conv.is_online && <div className={style.onlineBadge} />}
                </div>

                <div className={style.convInfo}>
                  <div className={style.convRow}>
                    <span className={style.username}>
                      {conv.username}
                    </span>
                    <span className={style.time}>
                      {conv.last_sent_at ? timeAgo(conv.last_sent_at) : ""}
                    </span>
                  </div>
                  <div className={style.convRow}>
                    {conv.user_id && typingUsers[conv.user_id] ? (
                      <p className={style.typingText}>Typing...</p>
                    ) : (
                      <p className={style.lastMsg}>{conv.last_message}</p>
                    )}
                    {unreadCount > 0 && (
                      <span className={style.notifBadge}>
                        {unreadCount > 9 ? "+9" : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
