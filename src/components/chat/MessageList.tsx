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
  onReactMessage?: (messageId: string, emoji: string) => Promise<void>;
  currentUserId?: string;
  otherMemberLastReadAt?: string | null;
  isGroupChat?: boolean;
}

const MessageList: React.FC<Props> = ({ messages, onDownloadAttachment, onEditMessage, onDeleteMessage, onReplyMessage, onForwardMessage, onReactMessage, currentUserId, otherMemberLastReadAt, isGroupChat }) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((m) => (
        <div key={m.id} className={`message-row ${m.isMe ? "me" : "them"}`}>
          <MessageBubble
            message={m}
            onDownloadAttachment={onDownloadAttachment}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onReply={onReplyMessage}
            onForward={onForwardMessage}
            onReact={onReactMessage}
            currentUserId={currentUserId}
            otherMemberLastReadAt={otherMemberLastReadAt}
            isGroupChat={isGroupChat}
          />
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
