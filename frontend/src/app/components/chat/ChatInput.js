"use client";

import { useState, useRef } from "react";
import { Send, Smile } from "lucide-react";
import style from "./chat.module.css";

const EMOJIS = ["😀", "😂", "🥰", "😎", "🤔", "😮", "😢", "😡", "👍", "🔥", "❤️", "✨"];

export default function ChatInput({ onSend }) {
    const [text, setText] = useState("");
    const [showEmojis, setShowEmojis] = useState(false);

    const handleSend = (e) => {
        e?.preventDefault();
        if (text.trim()) {
            onSend(text);
            setText("");
            setShowEmojis(false);
        }
    };

    const addEmoji = (emoji) => {
        setText((prev) => prev + emoji);
    };

    return (
        <div className={style.inputArea}>
            <form onSubmit={handleSend} className={style.inputForm}>
                <div className={style.emojiContainer}>
                    <button
                        type="button"
                        className={style.emojiBtn}
                        onClick={() => setShowEmojis(!showEmojis)}
                    >
                        <Smile size={24} />
                    </button>

                    {showEmojis && (
                        <div className={style.emojiPicker}>
                            {EMOJIS.map((e) => (
                                <button
                                    key={e}
                                    type="button"
                                    onClick={() => addEmoji(e)}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    className={style.textInput}
                />

                <button type="submit" className={style.sendBtn} disabled={!text.trim()}>
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}
