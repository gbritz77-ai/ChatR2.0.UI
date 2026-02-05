import React, { useRef, useState } from "react";
import GifPicker from "./GifPicker";
import Picker from "@emoji-mart/react";
import { presignUpload } from "../../api";

interface Props {
  chatId: string;

  // Your existing send: update it to accept optional attachmentId
  onSend: (text: string, gifUrl?: string, attachmentId?: string) => Promise<void> | void;
}

const MessageInput: React.FC<Props> = ({ chatId, onSend }) => {
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
    const presign = await presignUpload({
      chatId,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      fileSize: file.size,
    });

    const putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": presign.contentType },
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

    if (!chatId) {
      setError("ChatId missing");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      let attachmentId: string | undefined;

      if (selectedFile) {
        attachmentId = await uploadToS3(selectedFile);
      }

      await onSend(trimmed, selectedGifUrl || undefined, attachmentId);

      setText("");
      setSelectedGifUrl(null);
      clearFile();
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

  return (
    <div className="message-input-bar" style={{ position: "relative" }}>
      {error && (
        <div style={{ color: "#ef4444", padding: "6px 10px", fontSize: "0.85rem" }}>
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
          <Picker onEmojiSelect={handleEmojiSelect} theme="dark" />
        </div>
      )}

      {/* Selected GIF preview */}
      {selectedGifUrl && (
        <div
          style={{
            padding: "8px",
            borderBottom: "1px solid #374151",
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
              color: "#ef4444",
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Selected file preview */}
      {selectedFile && (
        <div
          style={{
            padding: "8px",
            borderBottom: "1px solid #374151",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#e5e7eb", fontSize: "0.85rem" }}>
              📎 {selectedFile.name}
            </span>
            <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
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
              color: "#ef4444",
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", width: "100%" }}>
        <button
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          title="Add emoji"
          disabled={busy}
          style={{
            borderRadius: "999px",
            border: "1px solid #374151",
            background: "transparent",
            color: "#fbbf24",
            padding: "8px 12px",
            cursor: busy ? "not-allowed" : "pointer",
            fontSize: "1rem",
            flexShrink: 0,
          }}
        >
          😊
        </button>

        <button
          type="button"
          onClick={() => setShowGifPicker(!showGifPicker)}
          title="Add GIF"
          disabled={busy}
          style={{
            borderRadius: "999px",
            border: "1px solid #374151",
            background: "transparent",
            color: "#38bdf8",
            padding: "8px 12px",
            cursor: busy ? "not-allowed" : "pointer",
            fontSize: "1rem",
            flexShrink: 0,
          }}
        >
          GIF
        </button>

        {/* Attach file */}
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
          style={{
            borderRadius: "999px",
            border: "1px solid #374151",
            background: "transparent",
            color: "#a78bfa",
            padding: "8px 12px",
            cursor: busy ? "not-allowed" : "pointer",
            fontSize: "1rem",
            flexShrink: 0,
          }}
        >
          📎
        </button>

        <textarea
          ref={textareaRef}
          className="message-input"
          placeholder={selectedGifUrl ? "Add a caption..." : "Type a message..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={busy}
          style={{
            flex: 1,
            width: "100%",
            resize: "none",
            borderRadius: "999px",
            border: "1px solid #374151",
            padding: "8px 12px",
            fontSize: "0.85rem",
            backgroundColor: "#020617",
            color: "#e5e7eb",
            outline: "none",
            fontFamily: "inherit",
            minHeight: "40px",
          }}
        />

        <button
          className="message-send-button"
          type="button"
          onClick={() => void handleSend()}
          disabled={busy}
          style={{
            borderRadius: "999px",
            border: "none",
            padding: "8px 16px",
            fontSize: "0.85rem",
            fontWeight: 500,
            background: "#38bdf8",
            color: "#020617",
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
