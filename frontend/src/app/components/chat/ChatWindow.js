"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft } from "lucide-react";
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
                    <img src="https://cdni.iconscout.com/illustration/premium/thumb/picking-chat-bubble-illustration-download-in-svg-png-gif-formats--select-message-conversation-bubbles-pack-network-communication-illustrations-8664406.png" alt="Select chat" />
                    <p>Select a user to start chatting</p>
                </div>
            </div>
        );
    }

    return (
        <div className={style.chatWindow}>
            <header className={style.windowHeader}>
                <button className={style.backBtn} onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <div className={style.headerAvatar}>
                    <img src={conversation.avatar ? `http://localhost:8080/${conversation.avatar}` : "https://img.freepik.com/premium-vector/silver-membership-icon-default-avatar-profile-icon-membership-icon-social-media-user-image-vector-illustration_561158-4215.jpg?semt=ais_incoming"} alt={conversation.username} />
                </div>
                <div className={style.headerInfo}>
                    <h4>{conversation.username}</h4>
                    {conversation.is_online ? <span className={style.onlineText}>Active now</span> : <span className={style.offlineText}>Offline</span>}
                </div>
            </header>


            <div className={style.messageList} ref={scrollRef}>
                {loading ? (
                    <div className={style.historyLoading}>Loading messages...</div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))
                )}
            </div>

            <ChatInput onSend={onSendMessage} />
        </div>
    );
}
