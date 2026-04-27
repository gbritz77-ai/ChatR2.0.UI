import React, { useRef, useState } from "react";
import type { Conversation } from "../../types/chat";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  conversation: Conversation;
  currentUserId: string;
  onDeleteGroup: (chatId: string) => void;
  onUpdateGroupPhoto: (chatId: string, file: File) => void;
}

const ChatHeader: React.FC<Props> = ({ conversation, currentUserId, onDeleteGroup, onUpdateGroupPhoto }) => {
  const { tokens } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGroupCreator =
    conversation.type === "group" &&
    conversation.createdByUserId === currentUserId;

  const handleDeleteClick = () => {
    setMenuOpen(false);
    if (window.confirm(`Delete "${conversation.name}"? This cannot be undone.`)) {
      onDeleteGroup(conversation.id);
    }
  };

  const handlePhotoClick = () => {
    setMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpdateGroupPhoto(conversation.id, file);
    e.target.value = "";
  };

  return (
    <header className="chat-header">
      <div className="chat-header-main">
        {conversation.type === "group" && conversation.chatAvatarUrl && (
          <img
            src={conversation.chatAvatarUrl}
            alt={conversation.name}
            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", marginRight: 10, flexShrink: 0 }}
          />
        )}
        <h2>{conversation.name}</h2>
        {conversation.type === "direct" && (
          <div className="chat-header-status" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`chat-header-status-dot ${conversation.isOnline ? "online" : "offline"}`} />
              <span style={{ color: conversation.isOnline ? "#16a34a" : undefined, fontWeight: conversation.isOnline ? 600 : undefined }}>
                {conversation.isOnline ? "Online" : "Offline"}
              </span>
            </div>
            {conversation.availabilitySchedule && conversation.availabilitySchedule.length > 0 && (
              <div style={{ fontSize: '0.72rem', color: tokens.textMuted, marginLeft: 2 }}>
                {conversation.availabilitySchedule.map(s => `${s.day} ${s.from}–${s.to}`).join(' · ')}
              </div>
            )}
          </div>
        )}
        {conversation.type === "group" && (
          <div className="chat-header-status">
            <span className="chat-header-status-dot group" />
            <span>Group chat</span>
          </div>
        )}
      </div>

      {isGroupCreator && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            title="Group settings"
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "6px 10px", borderRadius: 8, fontSize: "1.1rem",
              color: tokens.textMuted, lineHeight: 1,
            }}
          >
            ⋮
          </button>

          {menuOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 99 }}
                onClick={() => setMenuOpen(false)}
              />
              <div style={{
                position: "absolute", right: 0, top: "100%", zIndex: 100,
                background: tokens.bgCard, border: `1px solid ${tokens.border}`,
                borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                minWidth: 170, overflow: "hidden",
              }}>
                <button
                  onClick={handlePhotoClick}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "11px 16px", background: "none", border: "none",
                    cursor: "pointer", fontSize: "0.88rem", color: tokens.textMain,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = tokens.border)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  📷 Update photo
                </button>
                <div style={{ height: 1, background: tokens.border }} />
                <button
                  onClick={handleDeleteClick}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "11px 16px", background: "none", border: "none",
                    cursor: "pointer", fontSize: "0.88rem", color: "#ef4444",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  🗑 Delete group
                </button>
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>
      )}
    </header>
  );
};

export default ChatHeader;
