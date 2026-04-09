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

  useEffect(() => {
    selectedConvRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/ws/chat");
    socketRef.current = ws;

    ws.onopen = () => console.log("[Chat] Connected to WebSocket");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "status") {
        const { user_id, is_online } = data.user_status;
        const targetId = Number(user_id);
        setConversations((prev) =>
          prev.map((c) => (Number(c.user_id) === targetId ? { ...c, is_online } : c))
        );
        setSelectedConversation((prev) =>
          prev && Number(prev.user_id) === targetId ? { ...prev, is_online } : prev
        );
        return;
      }

      const msg = data;
      setMessages((prev) => {
        const currentConv = selectedConvRef.current;
        if (
          currentConv &&
          (msg.recipient_id === currentConv.user_id || msg.sender_id === currentConv.user_id)
        ) {
          return [...prev, msg];
        }
        return prev;
      });

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

    const handleUnload = () => ws.close();
    window.addEventListener("beforeunload", handleUnload);
    setSocket(ws);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      ws.close();
    };
  }, []);

  const sendMessage = (content) => {
    if (socketRef.current?.readyState === WebSocket.OPEN && selectedConversation) {
      socketRef.current.send(
        JSON.stringify({
          recipient_id: selectedConversation.user_id,
          content: content,
        })
      );
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    setShowList(false);
  };

  return (
    <div className={style.pageRoot}>
      <Renderbar />
      <div className={style.pageContent}>
        <main className={style.chatLayout}>
          <div className={`${style.sidebarWrapper} ${!showList ? style.mobileHidden : ""}`}>
            <ConversationList
              conversations={conversations}
              setConversations={setConversations}
              onSelect={handleSelectConversation}
              selectedId={selectedConversation?.user_id}
            />
          </div>
          <div className={`${style.windowWrapper} ${showList ? style.mobileHidden : ""}`}>
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              setMessages={setMessages}
              onSendMessage={sendMessage}
              onBack={() => setShowList(true)}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
