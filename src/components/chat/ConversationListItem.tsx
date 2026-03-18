import React from "react";
import type { Conversation } from "../../types/chat";


interface Props {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const ConversationListItem: React.FC<Props> = ({ conversation, isSelected, onClick }) => {
  const { name, lastMessagePreview, unreadCount, type, isOnline } = conversation;

  return (
    <button
      className={`conversation-item ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      type="button"
    >
      <div className="conversation-avatar">
        <span className="conversation-avatar-initials">
          {name
            .split(" ")
            .map((p) => p.charAt(0))
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
        {type === "direct" && (
          <span className={`conversation-status-dot ${isOnline ? "online" : "offline"}`} />
        )}
      </div>
      <div className="conversation-content">
        <div className="conversation-row-top">
          <span className="conversation-name">{name}</span>
          {unreadCount > 0 && <span className="conversation-unread-badge">{unreadCount}</span>}
        </div>
        {conversation.availability && (
          <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '2px' }}>
            {conversation.availability.days.split(',').join(' · ')} {conversation.availability.from}–{conversation.availability.to}
          </div>
        )}
        <div className="conversation-row-bottom">
          <span className="conversation-preview">{lastMessagePreview}</span>
        </div>
      </div>
    </button>
  );
};

export default ConversationListItem;
