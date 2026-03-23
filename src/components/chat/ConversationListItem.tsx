import React from "react";
import type { Conversation } from "../../types/chat";
import UserAvatar from "../ui/UserAvatar";


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
      <div className="conversation-avatar" style={{ position: 'relative', flexShrink: 0 }}>
        {type === "group" && conversation.chatAvatarUrl ? (
          <img
            src={conversation.chatAvatarUrl}
            alt={name}
            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <UserAvatar
            userId={type === "direct" ? conversation.otherUserId : undefined}
            name={name}
            size={36}
          />
        )}
        {type === "direct" && (
          <span className={`conversation-status-dot ${isOnline ? "online" : "offline"}`} />
        )}
      </div>
      <div className="conversation-content">
        <div className="conversation-row-top">
          <span className="conversation-name">
            {name}
            {type === "direct" && conversation.otherUserGroup && (
              <span style={{ fontWeight: 400, fontSize: "0.72em", opacity: 0.6, marginLeft: 5 }}>
                ({conversation.otherUserGroup})
              </span>
            )}
          </span>
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
