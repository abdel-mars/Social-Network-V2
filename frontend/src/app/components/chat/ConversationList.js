"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "../../lib/time";
import style from "./chat.module.css";


export default function ConversationList({ conversations, setConversations, onSelect, selectedId }) {
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
                <h3>Messages</h3>
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
                            className={`${style.convItem} ${selectedId === conv.user_id ? style.active : ""}`}
                            onClick={() => onSelect(conv)}
                        >
                            <div className={style.avatar}>
                                <div className={style.avatarContainer}>
                                    <div className={style.avatar}>
                                        <img
                                            src={conv.avatar ? `http://localhost:8080/${conv.avatar}` : "https://img.freepik.com/premium-vector/silver-membership-icon-default-avatar-profile-icon-membership-icon-social-media-user-image-vector-illustration_561158-4215.jpg?semt=ais_incoming"}
                                            alt={conv.username}
                                        />
                                    </div>
                                    {conv.is_online && <div className={style.onlineBadge} />}
                                </div>
                            </div>
                            <div className={style.convInfo}>
                                <div className={style.convRow}>
                                    <span className={style.username}>{conv.username}</span>
                                    <span className={style.time}>
                                        {conv.last_sent_at ? timeAgo(conv.last_sent_at) : ""}
                                    </span>
                                </div>
                                <p className={style.lastMsg}>{conv.last_message}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
}
