// src/components/chat/MessageBubble.tsx

import React, { useState, useRef, useEffect } from "react";
import type { Message, MessageAttachment } from "../../types/chat";

interface Props {
  message: Message;
  onDownloadAttachment: (attachmentId: string, chatId: string) => Promise<string>;
  onEdit?: (messageId: string, newText: string) => Promise<void>;
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

const MessageBubble: React.FC<Props> = ({ message, onDownloadAttachment, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.text || !onEdit) {
      setIsEditing(false);
      setEditText(message.text);
      return;
    }
    setIsSaving(true);
    try {
      await onEdit(message.id, trimmed);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSave();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditText(message.text);
    }
  };

  return (
    <div className={`message-bubble ${message.isMe ? "me" : "them"}`} style={{ position: "relative" }}>
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

      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={isSaving}
            style={{
              width: "100%",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(0,0,0,0.25)",
              color: "inherit",
              fontSize: "0.9rem",
              padding: "6px 8px",
              resize: "none",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => { setIsEditing(false); setEditText(message.text); }}
              style={{ fontSize: "0.75rem", padding: "2px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "inherit", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              style={{ fontSize: "0.75rem", padding: "2px 10px", borderRadius: 4, border: "none", background: "#38bdf8", color: "#000", cursor: "pointer", fontWeight: 600 }}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
          <span style={{ fontSize: "0.68rem", opacity: 0.5 }}>Enter to save · Esc to cancel</span>
        </div>
      ) : (
        <>
          {message.text && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
              <div className="message-text" style={{ flex: 1 }}>{message.text}</div>
              {message.isMe && onEdit && (
                <button
                  type="button"
                  onClick={() => { setEditText(message.text); setIsEditing(true); }}
                  title="Edit message"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "inherit", opacity: 0.4, padding: "0 2px", flexShrink: 0,
                    fontSize: "0.75rem", lineHeight: 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0.4")}
                >
                  ✎
                </button>
              )}
            </div>
          )}
        </>
      )}

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
        {message.isEdited && <span style={{ marginLeft: 4, opacity: 0.55, fontSize: "0.7em" }}>(edited)</span>}
      </span>
    </div>
  );
};

export default MessageBubble;
