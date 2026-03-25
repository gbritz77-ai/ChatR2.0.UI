// src/components/chat/MessageBubble.tsx

import React, { useState, useRef, useEffect } from "react";
import type { Message, MessageAttachment, ReplyPreview } from "../../types/chat";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface Props {
  message: Message;
  onDownloadAttachment: (attachmentId: string, chatId: string) => Promise<string>;
  onEdit?: (messageId: string, newText: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => Promise<void>;
  currentUserId?: string;
  otherMemberLastReadAt?: string | null;
  isGroupChat?: boolean;
}

// Tick icons — WhatsApp style
const SingleTick = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: "inline", verticalAlign: "middle", marginLeft: 4 }}>
    <path d="M1 5L4.5 8.5L12.5 1" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DoubleTick = ({ read }: { read: boolean }) => {
  const color = read ? "#38bdf8" : "rgba(255,255,255,0.5)";
  return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" style={{ display: "inline", verticalAlign: "middle", marginLeft: 4 }}>
      <path d="M1 5L4.5 8.5L12.5 1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 5L8.5 8.5L16.5 1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

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
        display: "flex", alignItems: "center", gap: "8px",
        background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "8px", padding: "6px 10px",
        cursor: loading ? "not-allowed" : "pointer",
        color: "#e5e7eb", fontSize: "0.8rem", marginTop: "6px",
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

const ReplyQuote: React.FC<{ replyTo: ReplyPreview }> = ({ replyTo }) => (
  <div style={{
    borderLeft: "3px solid rgba(255,255,255,0.4)",
    paddingLeft: 8,
    marginBottom: 6,
    opacity: 0.75,
  }}>
    <div style={{ fontSize: "0.72rem", fontWeight: 600, marginBottom: 2 }}>
      {replyTo.senderName}
    </div>
    <div style={{
      fontSize: "0.78rem",
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      maxWidth: 220,
    }}>
      {replyTo.text || "📎 Attachment"}
    </div>
  </div>
);

const MessageBubble: React.FC<Props> = ({ message, onDownloadAttachment, onEdit, onDelete, onReply, onForward, onReact, currentUserId, otherMemberLastReadAt, isGroupChat }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showEmojiPickerRef = useRef(false);
  showEmojiPickerRef.current = showEmojiPicker;

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowActions(true);
  };
  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      if (!showEmojiPickerRef.current) setShowActions(false);
    }, 300);
  };

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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSave(); }
    if (e.key === "Escape") { setIsEditing(false); setEditText(message.text); }
  };

  const actionBtnStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.35)", border: "none", borderRadius: 6,
    cursor: "pointer", color: "#e5e7eb", fontSize: "0.72rem",
    padding: "3px 7px", lineHeight: 1.4, whiteSpace: "nowrap",
  };

  return (
    <div
      className={`message-bubble ${message.isMe ? "me" : "them"}`}
      style={{ position: "relative" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Reply quote preview */}
      {message.replyTo && <ReplyQuote replyTo={message.replyTo} />}

      {!message.isMe && (
        <span className="message-sender">{message.senderName}</span>
      )}

      {message.gifUrl && (
        <img
          src={message.gifUrl}
          alt="GIF"
          style={{
            maxWidth: "300px", maxHeight: "250px",
            borderRadius: "4px", marginBottom: message.text ? "8px" : 0,
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
              width: "100%", borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(0,0,0,0.25)", color: "inherit",
              fontSize: "0.9rem", padding: "6px 8px", resize: "none",
              boxSizing: "border-box", outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button type="button"
              onClick={() => { setIsEditing(false); setEditText(message.text); }}
              style={{ fontSize: "0.75rem", padding: "2px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "inherit", cursor: "pointer" }}
            >Cancel</button>
            <button type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              style={{ fontSize: "0.75rem", padding: "2px 10px", borderRadius: 4, border: "none", background: "#38bdf8", color: "#000", cursor: "pointer", fontWeight: 600 }}
            >{isSaving ? "Saving…" : "Save"}</button>
          </div>
          <span style={{ fontSize: "0.68rem", opacity: 0.5 }}>Enter to save · Esc to cancel</span>
        </div>
      ) : (
        <>
          {message.text && (
            <div className="message-text">{message.text}</div>
          )}

          {/* Action buttons on hover */}
          {showActions && !isEditing && (
            <div
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{
                position: "absolute", top: -28,
                [message.isMe ? "right" : "left"]: 0,
                display: "flex", gap: 4, zIndex: 10,
              }}>
              {onReact && (
                <div style={{ position: "relative" }}>
                  <button type="button" style={actionBtnStyle}
                    onClick={() => setShowEmojiPicker(p => !p)}
                    title="React"
                  >😊</button>
                  {showEmojiPicker && (
                    <div
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        position: "absolute", top: -44,
                        [message.isMe ? "right" : "left"]: 0,
                        display: "flex", gap: 4, background: "rgba(0,0,0,0.75)",
                        borderRadius: 20, padding: "6px 10px", zIndex: 20,
                        boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                      }}>
                      {QUICK_EMOJIS.map(emoji => (
                        <button key={emoji} type="button"
                          onClick={() => {
                            void onReact(message.id, emoji);
                            setShowEmojiPicker(false);
                            setTimeout(() => setShowActions(false), 50);
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", padding: "2px 3px", lineHeight: 1 }}
                        >{emoji}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {onReply && (
                <button type="button" style={actionBtnStyle}
                  onClick={() => { onReply(message); setShowActions(false); }}
                  title="Reply"
                >↩ Reply</button>
              )}
              {onForward && (
                <button type="button" style={actionBtnStyle}
                  onClick={() => { onForward(message); setShowActions(false); }}
                  title="Forward"
                >⟫ Forward</button>
              )}
              {message.isMe && onEdit && (
                <button type="button" style={actionBtnStyle}
                  onClick={() => { setEditText(message.text); setIsEditing(true); setShowActions(false); }}
                  title="Edit"
                >✎ Edit</button>
              )}
              {message.isMe && onDelete && (
                <button type="button" style={{ ...actionBtnStyle, color: "#fca5a5" }}
                  disabled={isDeleting}
                  onClick={() => { setShowDeleteConfirm(true); setShowActions(false); }}
                  title="Delete"
                >🗑 Delete</button>
              )}
            </div>
          )}
        </>
      )}

      {message.attachments && message.attachments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {message.attachments.map((a) => (
            <AttachmentItem key={a.id} attachment={a} chatId={message.conversationId} onDownload={onDownloadAttachment} />
          ))}
        </div>
      )}

      {showDeleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        }}>
          <div style={{
            background: "#1e293b", borderRadius: 12, padding: "24px 28px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxWidth: 320, width: "90%",
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            <div style={{ fontWeight: 600, fontSize: "1rem", color: "#e5e7eb" }}>Delete message</div>
            <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
              This message will be permanently deleted for everyone in the chat.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#9ca3af", fontSize: "0.875rem", cursor: "pointer" }}
              >Cancel</button>
              <button type="button" disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  setShowDeleteConfirm(false);
                  try { await onDelete!(message.id); } finally { setIsDeleting(false); }
                }}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
              >{isDeleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reaction pills */}
      {message.reactions && message.reactions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {message.reactions.map(r => {
            const iReacted = currentUserId ? r.userIds.includes(currentUserId) : false;
            return (
              <button key={r.emoji} type="button"
                onClick={() => onReact && void onReact(message.id, r.emoji)}
                title={`${r.count} reaction${r.count !== 1 ? "s" : ""}`}
                style={{
                  display: "flex", alignItems: "center", gap: 3,
                  background: iReacted ? "rgba(56,189,248,0.25)" : "rgba(255,255,255,0.12)",
                  border: iReacted ? "1px solid rgba(56,189,248,0.5)" : "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12, padding: "2px 8px", cursor: "pointer",
                  fontSize: "0.82rem", lineHeight: 1.4,
                }}>
                <span>{r.emoji}</span>
                <span style={{ fontSize: "0.72rem", opacity: 0.85 }}>{r.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <span className="message-time">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        {message.isEdited && (
          <span style={{ marginLeft: 6, fontSize: "0.68em", opacity: 0.65, fontStyle: "italic", letterSpacing: "0.01em" }}>
            ✎ edited
          </span>
        )}
        {/* Read receipts — only on own messages in direct chats */}
        {message.isMe && !isGroupChat && (() => {
          const isTempMessage = message.id.startsWith("temp-");
          if (isTempMessage) return <SingleTick />;
          const read = !!(otherMemberLastReadAt && new Date(otherMemberLastReadAt) >= new Date(message.createdAt));
          return <DoubleTick read={read} />;
        })()}
      </span>
    </div>
  );
};

export default MessageBubble;
