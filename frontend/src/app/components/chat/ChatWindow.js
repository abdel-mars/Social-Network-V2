"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import style from "./chat.module.css";

export default function ChatWindow({ conversation, messages, setMessages, onSendMessage, onBack }) {
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!conversation) return;
    async function fetchHistory() {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8080/chat/messages?with=${conversation.user_id}`, {
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
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
          <img 
            src={conversation.avatar ? `http://localhost:8080/${conversation.avatar}` : "/default-avatar.png"} 
            alt={conversation.username} 
            className={style.headerAvatar}
            onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
          />
        </div>
        <div className={style.headerInfo}>
          <h4 className={style.headerName}>{conversation.username}</h4>
          <span className={conversation.is_online ? style.onlineText : style.offlineText}>
            {conversation.is_online ? "Active now" : "Offline"}
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
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
      </div>

      {/* Input */}
      <div className={style.inputContainer}>
        <ChatInput onSend={onSendMessage} />
      </div>
    </div>
  );
}
