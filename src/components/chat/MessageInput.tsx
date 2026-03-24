import React, { useRef, useState } from "react";
import GifPicker from "./GifPicker";
import Picker from "@emoji-mart/react";
import { presignUpload } from "../../api";
import { useTheme } from "../../context/ThemeContext";
import type { ReplyPreview } from "../../types/chat";

interface Props {
  chatId: string;
  onSend: (text: string, gifUrl?: string, attachmentId?: string, replyToMessageId?: string) => Promise<void> | void;
  replyingTo?: ReplyPreview & { messageId: string };
  onCancelReply?: () => void;
}

const MessageInput: React.FC<Props> = ({ chatId, onSend, replyingTo, onCancelReply }) => {
  const { theme, tokens } = useTheme();
  const [text, setText] = useState("");
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEmojiSelect = (emoji: any) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + emoji.native);
      setShowEmojiPicker(false);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + emoji.native + after;

    setText(newText);
    setShowEmojiPicker(false);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + emoji.native.length;
    }, 0);
  };

  const uploadToS3 = async (file: File): Promise<string> => {
    if (!chatId) throw new Error("ChatId missing");

    const presign = await presignUpload({
      chatId,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      fileSize: file.size,
    });

    if (!presign?.uploadUrl || !presign?.attachmentId) {
      throw new Error("Invalid presign response");
    }

    const putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": presign.contentType || "application/octet-stream" },
      body: file,
    });

    if (!putRes.ok) {
      const t = await putRes.text().catch(() => "");
      throw new Error(t || `S3 upload failed (${putRes.status})`);
    }

    return presign.attachmentId;
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedGifUrl && !selectedFile) return;

    setBusy(true);
    setError(null);

    try {
      let attachmentId: string | undefined;

      if (selectedFile) {
        attachmentId = await uploadToS3(selectedFile);
      }

      await onSend(trimmed, selectedGifUrl || undefined, attachmentId, replyingTo?.messageId);

      setText("");
      setSelectedGifUrl(null);
      clearFile();
      onCancelReply?.();
    } catch (e: any) {
      setError(e?.message ?? "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const iconBtnStyle = (color: string): React.CSSProperties => ({
    borderRadius: "999px",
    border: `1px solid ${tokens.border2}`,
    background: "transparent",
    color,
    padding: "8px 12px",
    cursor: busy ? "not-allowed" : "pointer",
    fontSize: "1rem",
    flexShrink: 0,
  });

  return (
    <div className="message-input-bar" style={{ position: "relative" }}>
      {replyingTo && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 12px", borderBottom: `1px solid ${tokens.border2}`,
          background: tokens.bgCard, borderRadius: "8px 8px 0 0", gap: 8,
        }}>
          <div style={{ borderLeft: `3px solid ${tokens.accent}`, paddingLeft: 8, minWidth: 0 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: tokens.accent }}>
              Replying to {replyingTo.senderName}
            </div>
            <div style={{ fontSize: "0.78rem", color: tokens.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {replyingTo.text || "📎 Attachment"}
            </div>
          </div>
          <button type="button" onClick={onCancelReply}
            style={{ background: "none", border: "none", cursor: "pointer", color: tokens.textMuted, fontSize: "1rem", flexShrink: 0 }}
          >✕</button>
        </div>
      )}
      {error && (
        <div style={{ color: tokens.danger, padding: "6px 10px", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {showGifPicker && (
        <GifPicker
          onSelectGif={(gifUrl) => {
            setSelectedGifUrl(gifUrl);
            setShowGifPicker(false);
          }}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      {showEmojiPicker && (
        <div style={{ position: "absolute", bottom: 60, left: 60, zIndex: 20 }}>
          <Picker onEmojiSelect={handleEmojiSelect} theme={theme} />
        </div>
      )}

      {selectedGifUrl && (
        <div
          style={{
            padding: "8px",
            borderBottom: `1px solid ${tokens.border2}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <img
            src={selectedGifUrl}
            alt="Selected GIF"
            style={{ maxHeight: "60px", borderRadius: "4px" }}
          />
          <button
            type="button"
            onClick={() => setSelectedGifUrl(null)}
            disabled={busy}
            style={{
              background: "none",
              border: "none",
              color: tokens.danger,
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {selectedFile && (
        <div
          style={{
            padding: "8px",
            borderBottom: `1px solid ${tokens.border2}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: tokens.textMain, fontSize: "0.85rem" }}>
              📎 {selectedFile.name}
            </span>
            <span style={{ color: tokens.textMuted, fontSize: "0.75rem" }}>
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          <button
            type="button"
            onClick={clearFile}
            disabled={busy}
            style={{
              background: "none",
              border: "none",
              color: tokens.danger,
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Row 1: text input full width */}
      <textarea
        ref={textareaRef}
        className="message-input"
        placeholder={selectedGifUrl ? "Add a caption..." : "Type a message..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        disabled={busy}
        style={{
          width: "100%",
          resize: "none",
          borderRadius: "12px",
          border: `1px solid ${tokens.border2}`,
          padding: "10px 14px",
          fontSize: "0.9rem",
          backgroundColor: tokens.bgInput,
          color: tokens.textMain,
          outline: "none",
          fontFamily: "inherit",
          minHeight: "52px",
          boxSizing: "border-box",
        }}
      />

      {/* Row 2: action buttons + send */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%", marginTop: "6px" }}>
        <button
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          title="Add emoji"
          disabled={busy}
          style={iconBtnStyle("#f59e0b")}
        >
          😊
        </button>

        <button
          type="button"
          onClick={() => setShowGifPicker(!showGifPicker)}
          title="Add GIF"
          disabled={busy}
          style={iconBtnStyle(tokens.accent)}
        >
          GIF
        </button>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*,application/pdf,video/mp4,video/quicktime"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setSelectedFile(f);
            setError(null);
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          disabled={busy}
          style={iconBtnStyle("#a78bfa")}
        >
          📎
        </button>

        {/* Spacer pushes Send to the right */}
        <div style={{ flex: 1 }} />

        <button
          className="message-send-button"
          type="button"
          onClick={() => void handleSend()}
          disabled={busy}
          style={{
            borderRadius: "999px",
            border: "none",
            padding: "8px 24px",
            fontSize: "0.85rem",
            fontWeight: 500,
            background: tokens.accent,
            color: tokens.textOnAccent,
            cursor: busy ? "not-allowed" : "pointer",
            flexShrink: 0,
            opacity: busy ? 0.8 : 1,
          }}
        >
          {busy ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
