"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import style from "./toast.module.css";

export default function Toast({ message, type = "success", onClose, duration = 3000 }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300); // Wait for fade-out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!message) return null;

    return (
        <div className={`${style.toastContainer} ${visible ? style.fadeIn : style.fadeOut} ${style[type]}`}>
            <div className={style.toastContent}>
                {type === "success" ? (
                    <CheckCircle size={20} className={style.icon} />
                ) : (
                    <XCircle size={20} className={style.icon} />
                )}
                <span className={style.message}>{message}</span>
            </div>
        </div>
    );
}
