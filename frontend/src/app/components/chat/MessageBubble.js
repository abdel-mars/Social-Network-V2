"use client";

import { Check, CheckCheck } from "lucide-react";
import dynamic from "next/dynamic";
import style from "./chat.module.css";

const Emoji = dynamic(() => import("emoji-picker-react").then(mod => mod.Emoji), {
  ssr: false,
});

import { EmojiStyle } from "emoji-picker-react";

export default function MessageBubble({ message }) {
  const currentUserId = parseInt(typeof window !== "undefined" ? localStorage.getItem("userId") : "0");
  const isSelf = message.sender_id === currentUserId;

  const renderContent = (content) => {
    if (!content) return null;

    // Regex to match emojis
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
    const parts = content.split(emojiRegex);
    const matches = content.match(emojiRegex) || [];

    let matchIndex = 0;
    return parts.map((part, index) => {
      // Every other part is a match if split by a capturing group
      // But split with capturing group in JS returns matches as separate elements
      // So if parts[index] matches the emoji, we render the Emoji component
      if (matches.includes(part) && content.includes(part)) {
        const unified = [...part].map(char => char.codePointAt(0).toString(16)).join("-");
        return <Emoji key={index} unified={unified} size={20} emojiStyle={EmojiStyle.GOOGLE} />;
      }
      return part;
    });
  };

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
          {!isSelf && message.group_id && (
            <span className={style.senderName}>{message.sender?.username}</span>
          )}
          <p>{renderContent(message.content)}</p>
        </div>
        <span className={style.msgTime}>
          {new Date(message.sent_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
          {isSelf && (
            message.is_read ? (
              <CheckCheck
                size={14}
                className={style.seenIcon}
                style={{ marginLeft: '4px', display: 'inline-block', verticalAlign: 'middle' }}
              />
            ) : (
              <Check
                size={14}
                className={style.unseenIcon}
                style={{ marginLeft: '4px', display: 'inline-block', verticalAlign: 'middle' }}
              />
            )
          )}
        </span>
      </div>
    </div>
  );
}
