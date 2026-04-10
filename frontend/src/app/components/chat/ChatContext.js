"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

const ChatContext = createContext();

export function ChatProvider({ children }) {
    const pathname = usePathname();
    const [unreadCounts, setUnreadCounts] = useState({});
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
                        counts[conv.user_id] = conv.unread_count;
                    }
                });
                setUnreadCounts(counts);
            }
        } catch (err) {
            console.error("Failed to fetch unread counts:", err);
        }
    }, []);

    const markAsRead = useCallback(async (senderId) => {
        try {
            const res = await fetch("http://localhost:8080/chat/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sender_id: senderId }),
                credentials: "include",
            });
            if (res.ok) {
                setUnreadCounts((prev) => {
                    const newCounts = { ...prev };
                    delete newCounts[senderId];
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
                    setUnreadCounts((prev) => {
                        const newCount = (prev[msg.sender_id] || 0) + 1;
                        return { ...prev, [msg.sender_id]: newCount };
                    });

                    if (pathname !== "/chat") {
                        setLastNotification({
                            sender_id: msg.sender_id,
                            sender_name: msg.sender?.username || "Someone",
                            content: msg.content,
                            sent_at: msg.sent_at,
                        });
                    }
                }
            } else if (data.type === "read_receipt") {
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
                socket,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export const useChat = () => useContext(ChatContext);
