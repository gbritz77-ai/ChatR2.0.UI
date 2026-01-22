import React, { useState, useRef } from "react";
import GifPicker from "./GifPicker";
import Picker from "@emoji-mart/react";

interface Props {
  onSend: (text: string, gifUrl?: string) => void;
}

const MessageInput: React.FC<Props> = ({ onSend }) => {
  const [text, setText] = useState("");
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedGifUrl) return;
    onSend(trimmed, selectedGifUrl || undefined);
    setText("");
    setSelectedGifUrl(null);
  };

  const handleEmojiSelect = (emoji: any) => {
    // Insert emoji at cursor position
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
    // Restore focus and cursor
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + emoji.native.length;
    }, 0);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input-bar" style={{ position: "relative" }}>
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

      {selectedGifUrl && (
        <div
          style={{
            padding: "8px",
            borderBottom: "1px solid #374151",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <img
            src={selectedGifUrl}
            alt="Selected GIF"
            style={{
              maxHeight: "60px",
              borderRadius: "4px",
            }}
          />
          <button
            type="button"
            onClick={() => setSelectedGifUrl(null)}
            style={{
              background: "none",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", width: '100%' }}>
        <button
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          title="Add emoji"
          style={{
            borderRadius: "999px",
            border: "1px solid #374151",
            background: "transparent",
            color: "#fbbf24",
            padding: "8px 12px",
            cursor: "pointer",
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
          style={{
            borderRadius: "999px",
            border: "1px solid #374151",
            background: "transparent",
            color: "#38bdf8",
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: "1rem",
            flexShrink: 0,
          }}
        >
          GIF
        </button>

        <textarea
          ref={textareaRef}
          className="message-input"
          placeholder={selectedGifUrl ? "Add a caption..." : "Type a message..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          style={{
            flex: 1,
            width: '100%',
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
          onClick={handleSend}
          style={{
            borderRadius: "999px",
            border: "none",
            padding: "8px 16px",
            fontSize: "0.85rem",
            fontWeight: 500,
            background: "#38bdf8",
            color: "#020617",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
