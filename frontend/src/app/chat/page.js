"use client";

import { useState, useEffect, useRef } from "react";
import { Renderbar } from "../components/bar/bar";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";
import style from "./page.module.css";

export default function ChatPage() {
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [showList, setShowList] = useState(true);
    const socketRef = useRef(null);

    const selectedConvRef = useRef(null);

    // Keep ref in sync
    useEffect(() => {
        selectedConvRef.current = selectedConversation;
    }, [selectedConversation]);

    useEffect(() => {
        // Initialize WebSocket once
        const ws = new WebSocket("ws://localhost:8080/ws/chat");
        socketRef.current = ws;

        ws.onopen = () => {
            console.log("[Chat] Connected to WebSocket");
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("[Chat] Received data:", data);

            if (data.type === "status") {
                const { user_id, is_online } = data.user_status;
                const targetId = Number(user_id);
                setConversations((prev) =>
                    prev.map(c => Number(c.user_id) === targetId ? { ...c, is_online } : c)
                );
                // Also update selected conversation if it's the same user
                setSelectedConversation(prev =>
                    (prev && Number(prev.user_id) === targetId) ? { ...prev, is_online } : prev
                );
                return;
            }

            // Normal chat message
            const msg = data;

            // Update messages if the message belongs to the current conversation
            setMessages((prev) => {
                const currentConv = selectedConvRef.current;
                // If message is from/to the selected recipient, add it
                if (
                    (currentConv && (msg.recipient_id === currentConv.user_id || msg.sender_id === currentConv.user_id))
                ) {
                    return [...prev, msg];
                }
                return prev;
            });

            // Update conversations list (move to top, update last message)
            setConversations((prev) => {
                const userId = parseInt(localStorage.getItem("userId"));
                const otherID = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
                const index = prev.findIndex((c) => c.user_id === otherID);

                let updatedConversations = [...prev];
                if (index !== -1) {
                    const updated = {
                        ...updatedConversations[index],
                        last_message: msg.content,
                        last_sent_at: msg.sent_at,
                    };
                    updatedConversations.splice(index, 1);
                    updatedConversations.unshift(updated);
                }
                return updatedConversations;
            });
        };

        ws.onclose = () => {
            console.log("[Chat] Disconnected from WebSocket");
        };

        const handleUnload = () => {
            ws.close();
        };
        window.addEventListener("beforeunload", handleUnload);

        setSocket(ws);

        return () => {
            window.removeEventListener("beforeunload", handleUnload);
            ws.close();
        };
    }, []); // Empty dependency array: open once!


    const sendMessage = (content) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && selectedConversation) {
            const payload = {
                recipient_id: selectedConversation.user_id,
                content: content,
            };
            socketRef.current.send(JSON.stringify(payload));
        }
    };

    const handleSelectConversation = (conv) => {
        setSelectedConversation(conv);
        setShowList(false); // Hide list on mobile
    };

    return (
        <div className={style.chatLayout}>
            <Renderbar />
            <main className={style.chatMain}>
                <div className={style.chatContainer}>
                    <div className={`${style.conversationListWrapper} ${!showList ? style.hideOnMobile : ""}`}>
                        <ConversationList
                            conversations={conversations}
                            setConversations={setConversations}
                            onSelect={handleSelectConversation}
                            selectedId={selectedConversation?.user_id}
                        />
                    </div>
                    <div className={`${style.chatWindowWrapper} ${showList ? style.hideOnMobile : ""}`}>
                        <ChatWindow
                            conversation={selectedConversation}
                            messages={messages}
                            setMessages={setMessages}
                            onSendMessage={sendMessage}
                            onBack={() => setShowList(true)}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

