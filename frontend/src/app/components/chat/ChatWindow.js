"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, MessageSquare, Users } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { useChat } from "./ChatContext";
import style from "./chat.module.css";

export default function ChatWindow({ conversation, messages, setMessages, onSendMessage, onSendTyping, isTyping, onBack }) {
  const { socket } = useChat();
  const [loading, setLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!conversation) return;
    setOffset(0);
    setHasMore(true);
    setMessages([]);
    isInitialLoad.current = true;

    async function fetchInitialHistory() {
      setLoading(true);
      try {
        const url = conversation.group_id
          ? `http://localhost:8080/group/chat/messages?group_id=${conversation.group_id}&limit=30&offset=0`
          : `http://localhost:8080/chat/messages?with=${conversation.user_id}&limit=30&offset=0`;

        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setMessages(data || []);
          setOffset((data || []).length);
          if (!data || data.length < 30) {
            setHasMore(false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialHistory();
  }, [conversation, setMessages]);

  const loadMoreMessages = async () => {
    if (loadMoreLoading || !hasMore || !conversation) return;

    setLoadMoreLoading(true);
    if (scrollRef.current) {
      prevScrollHeightRef.current = scrollRef.current.scrollHeight;
    }

    try {
      const url = conversation.group_id
        ? `http://localhost:8080/group/chat/messages?group_id=${conversation.group_id}&limit=30&offset=${offset}`
        : `http://localhost:8080/chat/messages?with=${conversation.user_id}&limit=30&offset=${offset}`;

      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setMessages(prev => [...data, ...prev]);
          setOffset(prev => prev + data.length);
          if (data.length < 30) {
            setHasMore(false);
          }
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      setLoadMoreLoading(false);
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    // Load more when user scrolls near the top (e.g., within 200px)
    if (scrollRef.current.scrollTop < 200 && hasMore && !loadMoreLoading && !loading) {
      loadMoreMessages();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      if (isInitialLoad.current && messages.length > 0) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        isInitialLoad.current = false;
      } else if (prevScrollHeightRef.current > 0) {
        const newScrollHeight = scrollRef.current.scrollHeight;
        scrollRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current;
        prevScrollHeightRef.current = 0;
      } else {
        // Only scroll to bottom for typing or new messages if we are already near bottom
        const isNearBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 100;
        if (isNearBottom) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }
    }
  }, [messages, isTyping]);

  const toggleReaction = (messageId) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    
    // Optimistic UI update
    setMessages((prev) => 
      prev.map(msg => {
        if (msg.id === messageId) {
          const wasLiked = msg.user_liked;
          return {
            ...msg,
            user_liked: !wasLiked,
            like_count: wasLiked ? Math.max(0, msg.like_count - 1) : msg.like_count + 1
          };
        }
        return msg;
      })
    );

    socket.send(JSON.stringify({
      type: "reaction",
      message_id: messageId,
      group_id: conversation.group_id || 0,
      recipient_id: conversation.user_id || 0
    }));
  };

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
      <div className={style.messageList} ref={scrollRef} onScroll={handleScroll}>
        {loadMoreLoading && (
          <div className={style.loadMoreSpinner}>
            <div className={style.spinnerSmall} />
          </div>
        )}
        {loading ? (
          <div className={style.historyLoading}><div className={style.spinner} /></div>
        ) : messages.length === 0 ? (
          <div className={style.noMessages}>Say hi to initiate the conversation!</div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onReact={toggleReaction} />
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
