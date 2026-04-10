"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import style from "./chat.module.css";

export default function ChatInput({ onSend, onSendTyping }) {
  const [content, setContent] = useState("");
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setContent(value);

    // If starting to type
    if (!isTypingRef.current && value.trim().length > 0) {
      isTypingRef.current = true;
      onSendTyping(true);
    }

    // Reset timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onSendTyping(false);
      }
    }, 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const txt = content.trim();
    if (txt) {
      // Stop typing status immediately on send
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      isTypingRef.current = false;
      onSendTyping(false);

      onSend(txt);
      setContent("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <form className={style.inputForm} onSubmit={handleSubmit}>
      <input
        type="text"
        className={style.textField}
        placeholder="Type a message..."
        value={content}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
      <button
        type="submit"
        className={style.sendBtn}
        disabled={!content.trim()}
      >
        <Send size={18} strokeWidth={2.2} />
      </button>
    </form>
  );
}
