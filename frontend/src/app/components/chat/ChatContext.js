"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

const ChatContext = createContext();

export function ChatProvider({ children }) {
    const pathname = usePathname();
    const [unreadCounts, setUnreadCounts] = useState({});
    const [activeChatId, setActiveChatId] = useState(null); // 'user_id' or 'group_id' key
    const activeChatIdRef = useRef(null);
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const [lastNotification, setLastNotification] = useState(null);
    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null);

    const fetchUnreadCounts = useCallback(async () => {
        try {
            const res = await fetch("http://localhost:8080/chat/conversations", {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                const counts = {};
                data.forEach((conv) => {
                    if (conv.unread_count > 0) {
                        const key = conv.group_id ? `group_${conv.group_id}` : conv.user_id;
                        counts[key] = conv.unread_count;
                    }
                });
                setUnreadCounts(counts);
            }
        } catch (err) {
            console.error("Failed to fetch unread counts:", err);
        }
    }, []);

    const markAsRead = useCallback(async (senderId, groupId = null) => {
        try {
            const res = await fetch("http://localhost:8080/chat/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sender_id: senderId, group_id: groupId }),
                credentials: "include",
            });
            if (res.ok) {
                setUnreadCounts((prev) => {
                    const newCounts = { ...prev };
                    const key = groupId ? `group_${groupId}` : senderId;
                    delete newCounts[key];
                    return newCounts;
                });
            }
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    }, []);

    useEffect(() => {
        const total = Object.values(unreadCounts).reduce((sum, count) => (sum || 0) + (count || 0), 0);
        setTotalUnreadCount(total);
    }, [unreadCounts]);

    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);

    useEffect(() => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        fetchUnreadCounts();

        const ws = new WebSocket("ws://localhost:8080/ws/chat");
        socketRef.current = ws;
        setSocket(ws);

        const handleMessage = (event) => {
            const data = JSON.parse(event.data);
            const currentUserId = parseInt(localStorage.getItem("userId"));

            if (data.type === "chat") {
                const msg = data;
                if (msg.recipient_id === currentUserId) {
                    if (String(activeChatIdRef.current) !== String(msg.sender_id)) {
                        setUnreadCounts((prev) => {
                            const newCount = (prev[msg.sender_id] || 0) + 1;
                            return { ...prev, [msg.sender_id]: newCount };
                        });
                    } else {
                        console.log("Suppressed unread for active sender:", msg.sender_id);
                    }

                    if (pathname !== "/chat") {
                        setLastNotification({
                            sender_id: msg.sender_id,
                            sender_name: msg.sender?.username || "Someone",
                            content: msg.content,
                            sent_at: msg.sent_at,
                        });
                    }
                }
            } else if (data.type === "group_chat") {
                const msg = data;
                if (msg.sender_id !== currentUserId) {
                    const groupKey = `group_${msg.group_id}`;
                    if (String(activeChatIdRef.current) !== String(groupKey)) {
                        setUnreadCounts((prev) => {
                            const newCount = (prev[groupKey] || 0) + 1;
                            return { ...prev, [groupKey]: newCount };
                        });
                    } else {
                        console.log("Suppressed unread for active group:", groupKey);
                    }

                    if (pathname !== "/chat") {
                        setLastNotification({
                            group_id: msg.group_id,
                            sender_name: msg.sender?.username || "Someone",
                            content: `[Group] ${msg.content}`,
                            sent_at: msg.sent_at,
                        });
                    }
                }
            }
            else if (data.type === "read_receipt") {
                const { sender_id, recipient_id } = data;
                // If I am the one who read the messages (all my tabs should sync)
                if (recipient_id === currentUserId) {
                    setUnreadCounts((prev) => {
                        const newCounts = { ...prev };
                        delete newCounts[sender_id];
                        return newCounts;
                    });
                }
            }
        };

        ws.addEventListener("message", handleMessage);

        const handleUnload = () => ws.close();
        window.addEventListener("beforeunload", handleUnload);

        return () => {
            window.removeEventListener("beforeunload", handleUnload);
            ws.removeEventListener("message", handleMessage);
            ws.close();
            setSocket(null);
        };
    }, [fetchUnreadCounts, pathname]);

    return (
        <ChatContext.Provider
            value={{
                unreadCounts,
                totalUnreadCount,
                lastNotification,
                setLastNotification,
                markAsRead,
                setActiveChatId,
                socket,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export const useChat = () => useContext(ChatContext);
