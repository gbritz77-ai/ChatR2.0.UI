// src/components/chat/MessageList.tsx

import React, { useEffect, useRef } from "react";
import type { Message } from "../../types/chat";
import MessageBubble from "./MessageBubble";

interface Props {
  messages: Message[];
  onDownloadAttachment: (attachmentId: string, chatId: string) => Promise<string>;
  onEditMessage?: (messageId: string, newText: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onReplyMessage?: (message: Message) => void;
  onForwardMessage?: (message: Message) => void;
}

const MessageList: React.FC<Props> = ({ messages, onDownloadAttachment, onEditMessage, onDeleteMessage, onReplyMessage, onForwardMessage }) => {
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
        <div key={m.id} className={`message-row ${m.isMe ? "me" : "them"}`}>
          <MessageBubble
            message={m}
            onDownloadAttachment={onDownloadAttachment}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onReply={onReplyMessage}
            onForward={onForwardMessage}
          />
        </div>
      ))}
    </div>
  );
};

export default MessageList;
