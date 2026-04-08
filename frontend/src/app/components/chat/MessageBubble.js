"use client";

import style from "./chat.module.css";

export default function MessageBubble({ message }) {
    const currentUserId = parseInt(localStorage.getItem("userId"));
    const isSelf = message.sender_id === currentUserId;

    return (
        <div className={`${style.messageWrapper} ${isSelf ? style.self : style.other}`}>
            {!isSelf && (
                <div className={style.msgAvatar}>
                    <img
                        src={message.sender.avatar ? `http://localhost:8080/${message.sender.avatar}` : "https://img.freepik.com/premium-vector/silver-membership-icon-default-avatar-profile-icon-membership-icon-social-media-user-image-vector-illustration_561158-4215.jpg?semt=ais_incoming"}
                        alt={message.sender.username}
                    />
                </div>
            )}
            <div className={style.messageContent}>
                <div className={style.bubble}>
                    <p>{message.content}</p>
                </div>
                <span className={style.msgTime}>
                    {new Date(message.sent_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                </span>
            </div>
        </div>
    );
}
