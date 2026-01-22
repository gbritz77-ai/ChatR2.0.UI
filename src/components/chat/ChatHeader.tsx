import React from "react";
import type { Conversation } from "../../types/chat";

interface Props {
  conversation: Conversation;
}

const ChatHeader: React.FC<Props> = ({ conversation }) => {
  return (
    <header className="chat-header">
      <div className="chat-header-main">
        <h2>{conversation.name}</h2>
        {conversation.type === "direct" && (
          <div className="chat-header-status">
            <span
              className={`chat-header-status-dot ${
                conversation.isOnline ? "online" : "offline"
              }`}
            />
            <span>{conversation.isOnline ? "Online" : "Offline"}</span>
          </div>
        )}
        {conversation.type === "group" && (
          <div className="chat-header-status">
            <span className="chat-header-status-dot group" />
            <span>Group chat</span>
          </div>
        )}
      </div>
      {/* Right side: later add search, settings, etc. */}
    </header>
  );
};

export default ChatHeader;
