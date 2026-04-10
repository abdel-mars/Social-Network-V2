"use client";

import { useEffect, useState } from "react";
import { useChat } from "./ChatContext";
import { X, MessageSquare } from "lucide-react";
import style from "./chat.module.css";

export function ChatPopup() {
    const { lastNotification, setLastNotification } = useChat();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (lastNotification) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(() => setLastNotification(null), 300); // Wait for fade out
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [lastNotification, setLastNotification]);

    if (!lastNotification && !visible) return null;

    return (
        <div className={`${style.popupContainer} ${visible ? style.popupVisible : ""}`}>
            <div className={style.popupContent}>
                <div className={style.popupIcon}>
                    <MessageSquare size={18} />
                </div>
                <div className={style.popupBody}>
                    <div className={style.popupHeader}>
                        <strong>{lastNotification?.sender_name}</strong>
                        <button onClick={() => setVisible(false)} className={style.closeBtn}>
                            <X size={14} />
                        </button>
                    </div>
                    <p className={style.popupText}>{lastNotification?.content}</p>
                </div>
            </div>
        </div>
    );
}
