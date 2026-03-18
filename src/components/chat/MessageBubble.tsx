// src/components/chat/MessageBubble.tsx

import React, { useState } from "react";
import type { Message, MessageAttachment } from "../../types/chat";

interface Props {
  message: Message;
  onDownloadAttachment: (attachmentId: string, chatId: string) => Promise<string>;
}

const AttachmentItem: React.FC<{
  attachment: MessageAttachment;
  chatId: string;
  onDownload: (attachmentId: string, chatId: string) => Promise<string>;
}> = ({ attachment, chatId, onDownload }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const url = await onDownload(attachment.id, chatId);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  };

  const isImage = attachment.contentType.startsWith("image/");

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "8px",
        padding: "6px 10px",
        cursor: loading ? "not-allowed" : "pointer",
        color: "#e5e7eb",
        fontSize: "0.8rem",
        marginTop: "6px",
        opacity: loading ? 0.7 : 1,
      }}
    >
      <span>{isImage ? "🖼" : "📎"}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
        {attachment.fileName}
      </span>
      <span style={{ color: "#94a3b8", flexShrink: 0 }}>
        {loading ? "Opening…" : "↗"}
      </span>
    </button>
  );
};

const MessageBubble: React.FC<Props> = ({ message, onDownloadAttachment }) => {
  return (
    <div className={`message-bubble ${message.isMe ? "me" : "them"}`}>
      {!message.isMe && (
        <span className="message-sender">{message.senderName}</span>
      )}
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
      {message.attachments && message.attachments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {message.attachments.map((a) => (
            <AttachmentItem
              key={a.id}
              attachment={a}
              chatId={message.conversationId}
              onDownload={onDownloadAttachment}
            />
          ))}
        </div>
      )}
      <span className="message-time">
        {new Date(message.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
};

export default MessageBubble;
