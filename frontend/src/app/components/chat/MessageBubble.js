"use client";

import style from "./chat.module.css";

export default function MessageBubble({ message }) {
  const currentUserId = parseInt(localStorage.getItem("userId"));
  const isSelf = message.sender_id === currentUserId;

  return (
    <div className={`${style.messageWrapper} ${isSelf ? style.self : style.other}`}>
      {!isSelf && (
        <div className={style.msgAvatarWrapper}>
          <img
            src={message.sender?.avatar ? `http://localhost:8080/${message.sender.avatar}` : "/default-avatar.png"}
            alt="avatar"
            className={style.msgAvatar}
            onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
          />
        </div>
      )}
      
      <div className={style.messageContent}>
        <div className={style.bubble}>
          <p>{message.content}</p>
        </div>
        <span className={style.msgTime}>
          {new Date(message.sent_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
