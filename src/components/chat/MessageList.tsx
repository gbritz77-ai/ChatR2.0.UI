// src/components/chat/MessageList.tsx

import React, { useEffect, useRef } from "react";
import type { Message } from "../../types/chat";
import MessageBubble from "./MessageBubble";

interface Props {
  messages: Message[];
}

const MessageList: React.FC<Props> = ({ messages }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="message-list" ref={containerRef}>
      {messages.map((m) => (
        <div
          key={m.id}
          className={`message-row ${m.isMe ? "me" : "them"}`}
        >
          <MessageBubble message={m} />
        </div>
      ))}
    </div>
  );
};

export default MessageList;
