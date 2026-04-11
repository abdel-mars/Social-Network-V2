"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Smile } from "lucide-react";
import dynamic from "next/dynamic";
import style from "./chat.module.css";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});



export default function ChatInput({ onSend, onSendTyping }) {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const pickerRef = useRef(null);

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

  const handleEmojiClick = (emojiData) => {
    if (content.length + emojiData.emoji.length > 300) return;
    setContent((prev) => prev + emojiData.emoji);
    // Optional: focus back to input after emoji selection
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
      setShowEmojiPicker(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <form className={style.inputForm} onSubmit={handleSubmit}>
      <button
        type="button"
        className={style.emojiToggle}
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
      >
        <Smile size={20} strokeWidth={2} />
      </button>

      {showEmojiPicker && (
        <div className={style.emojiPickerContainer} ref={pickerRef}>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            theme="auto"
            emojiStyle="google"
            searchDisabled={true}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
            width={280}
            height={320}
          />
        </div>
      )}

      <div className={style.inputWrapper}>
        <input
          type="text"
          className={style.textField}
          placeholder="Type a message..."
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          maxLength={300}
        />
        <span className={`${style.charCounter} ${content.length >= 300 ? style.maxReached : ""}`}>
          {content.length}/300
        </span>
      </div>
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
