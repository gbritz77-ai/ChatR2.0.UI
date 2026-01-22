// src/components/chat/MessageBubble.tsx

import React from "react";
import type { Message } from "../../types/chat";

interface Props {
  message: Message;
}

const MessageBubble: React.FC<Props> = ({ message }) => {
  return (
    <div className="message-bubble">
      <div className="message-meta">
        <span className="message-sender">{message.senderName}</span>
        <span className="message-time">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      {message.gifUrl && (
        <img
          src={message.gifUrl}
          alt="GIF"
          style={{
            maxWidth: "300px",
            maxHeight: "250px",
            borderRadius: "4px",
            marginBottom: message.text ? "8px" : 0,
          }}
        />
      )}
      {message.text && <div className="message-text">{message.text}</div>}
    </div>
  );
};

export default MessageBubble;
