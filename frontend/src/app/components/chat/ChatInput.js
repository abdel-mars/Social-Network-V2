"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import style from "./chat.module.css";

export default function ChatInput({ onSend }) {
  const [content, setContent] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const txt = content.trim();
    if (txt) {
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

  return (
    <form className={style.inputForm} onSubmit={handleSubmit}>
      <input
        type="text"
        className={style.textField}
        placeholder="Type a message..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
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
