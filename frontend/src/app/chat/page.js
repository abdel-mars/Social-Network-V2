"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Renderbar } from "../components/bar/bar";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";
import { useChat } from "../components/chat/ChatContext";
import style from "./page.module.css";

export default function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [showList, setShowList] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const [activeTab, setActiveTab] = useState("direct");
  const selectedConvRef = useRef(null);
  const { socket, markAsRead, setActiveChatId } = useChat();

  const searchParams = useSearchParams();

  useEffect(() => {
    selectedConvRef.current = selectedConversation;
    if (selectedConversation) {
      const id = selectedConversation.group_id ? `group_${selectedConversation.group_id}` : selectedConversation.user_id;
      setActiveChatId(id);
      markAsRead(selectedConversation.user_id, selectedConversation.group_id);
    } else {
      setActiveChatId(null);
    }
  }, [selectedConversation, markAsRead, setActiveChatId]);

  useEffect(() => {
    if (conversations.length > 0) {
      const groupId = searchParams.get("group_id");
      const userId = searchParams.get("user_id");

      if (groupId) {
        const group = conversations.find(c => c.group_id === parseInt(groupId));
        if (group) {
          setSelectedConversation(group);
          setActiveTab("groups");
          setShowList(false);
          // Clear URL parameters
          window.history.replaceState({}, "", "/chat");
        }
      } else if (userId) {
        const user = conversations.find(c => c.user_id === parseInt(userId));
        if (user) {
          setSelectedConversation(user);
          setActiveTab("direct");
          setShowList(false);
          // Clear URL parameters
          window.history.replaceState({}, "", "/chat");
        }
      }
    }
  }, [searchParams, conversations]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
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
        if (!is_online) {
          setTypingUsers((prev) => ({ ...prev, [targetId]: false }));
        }
        return;
      }

      if (data.type === "typing") {
        const { sender_id, content } = data;
        setTypingUsers((prev) => ({
          ...prev,
          [sender_id]: content === "start",
        }));
        return;
      }

      if (data.type === "read_receipt") {
        const companionId = Number(data.recipient_id); // the person who read my messages
        const currentConv = selectedConvRef.current;
        if (currentConv && Number(currentConv.user_id) === companionId) {
          setMessages((prev) =>
            prev.map((msg) =>
              Number(msg.recipient_id) === companionId ? { ...msg, is_read: true } : msg
            )
          );
        }
        return;
      }

      if (data.type === "group_chat") {
        const msg = data;
        setMessages((prev) => {
          const currentConv = selectedConvRef.current;
          if (currentConv && currentConv.group_id === msg.group_id) {
            markAsRead(undefined, msg.group_id);
            return [...prev, msg];
          }
          return prev;
        });

        setConversations((prev) => {
          const index = prev.findIndex((c) => c.group_id === msg.group_id);
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
        return;
      }

      const msg = data;
      setMessages((prev) => {
        const currentConv = selectedConvRef.current;
        if (
          currentConv &&
          (msg.recipient_id === currentConv.user_id || msg.sender_id === currentConv.user_id) &&
          !currentConv.group_id // Ensure it's not a group session
        ) {
          if (msg.sender_id === currentConv.user_id) {
            markAsRead(msg.sender_id);
          }
          return [...prev, { ...msg, is_read: msg.is_read || false }];
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

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket]);

  const sendMessage = (content) => {
    if (socket?.readyState === WebSocket.OPEN && selectedConversation) {
      const payload = selectedConversation.group_id
        ? {
          type: "group_chat",
          group_id: selectedConversation.group_id,
          content: content,
        }
        : {
          recipient_id: selectedConversation.user_id,
          content: content,
        };
      socket.send(JSON.stringify(payload));
    }
  };

  const sendTypingStatus = (isTyping) => {
    if (socket?.readyState === WebSocket.OPEN && selectedConversation && !selectedConversation.group_id) {
      socket.send(
        JSON.stringify({
          type: "typing",
          recipient_id: selectedConversation.user_id,
          content: isTyping ? "start" : "stop",
        })
      );
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    setShowList(false);
  };

  const selectedId = selectedConversation?.group_id
    ? `group_${selectedConversation.group_id}`
    : selectedConversation?.user_id;

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
              selectedId={selectedId}
              typingUsers={typingUsers}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </div>
          <div className={`${style.windowWrapper} ${showList ? style.mobileHidden : ""}`}>
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              setMessages={setMessages}
              onSendMessage={sendMessage}
              onSendTyping={sendTypingStatus}
              isTyping={selectedConversation?.user_id ? !!typingUsers[selectedConversation.user_id] : false}
              onBack={() => setShowList(true)}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
