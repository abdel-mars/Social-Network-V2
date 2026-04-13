"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, MessageSquare, Users } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { useChat } from "./ChatContext";
import style from "./chat.module.css";

export default function ChatWindow({ conversation, messages, setMessages, onSendMessage, onSendTyping, isTyping, onBack }) {
  const { unreadCounts } = useChat();
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!conversation) return;
    async function fetchHistory() {
      setLoading(true);
      try {
        const url = conversation.group_id
          ? `http://localhost:8080/group/chat/messages?group_id=${conversation.group_id}`
          : `http://localhost:8080/chat/messages?with=${conversation.user_id}`;

        const res = await fetch(url, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [conversation, setMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      // Use a small timeout to ensure layout is updated before scrolling
      const timer = setTimeout(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages, isTyping]);

  if (!conversation) {
    return (
      <div className={style.chatWindowEmpty}>
        <div className={style.emptyContent}>
          <div className={style.emptyIcon}>
            <MessageSquare size={48} strokeWidth={1.5} />
          </div>
          <p className={style.emptyText}>Select a user to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className={style.chatWindow}>
      {/* Header */}
      <header className={style.windowHeader}>
        <button className={style.backBtn} onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className={style.headerAvatarWrapper}>
          {conversation.group_id ? (
            <div className={style.groupAvatarPlaceholder}>
              <Users size={20} />
            </div>
          ) : (
            <img
              src={conversation.avatar ? `http://localhost:8080/${conversation.avatar}` : "/default-avatar.png"}
              alt={conversation.username}
              className={style.headerAvatar}
              onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
            />
          )}
        </div>
        <div className={style.headerInfo}>
          <h4 className={style.headerName}>
            {conversation.group_id ? ` ${conversation.username}` : conversation.username}
          </h4>
          <span className={conversation.group_id ? style.onlineText : (conversation.is_online ? style.onlineText : style.offlineText)}>
            {conversation.group_id ? `${conversation.online_count || 0} members online` : (conversation.is_online ? "Active now" : "Offline")}
          </span>
        </div>
      </header>

      {/* Messages */}
      <div className={style.messageList} ref={scrollRef}>
        {loading ? (
          <div className={style.historyLoading}><div className={style.spinner} /></div>
        ) : messages.length === 0 ? (
          <div className={style.noMessages}>Say hi to initiate the conversation!</div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isTyping && (
              <div className={style.typingStatus}>
                <span className={style.typingDot}></span>
                <span className={style.typingDot}></span>
                <span className={style.typingDot}></span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className={style.inputContainer}>
        <ChatInput onSend={onSendMessage} onSendTyping={onSendTyping} />
      </div>
    </div>
  );
}
