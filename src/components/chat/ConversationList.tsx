import React from "react";
import type { Conversation } from "../../types/chat";
import ConversationListItem from "./ConversationListItem";


interface Props {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const ConversationList: React.FC<Props> = ({ conversations, selectedId, onSelect }) => {
  const groups = conversations.filter((c) => c.type === "group");
  const directs = conversations.filter((c) => c.type === "direct");

  const sectionLabel: React.CSSProperties = {
    padding: "10px 14px 4px",
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    opacity: 0.5,
  };

  return (
    <div className="conversation-list">
      {groups.length > 0 && (
        <>
          <div style={sectionLabel}>Groups</div>
          {groups.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedId}
              onClick={() => onSelect(conv.id)}
            />
          ))}
        </>
      )}
      {directs.length > 0 && (
        <>
          <div style={{ ...sectionLabel, marginTop: groups.length > 0 ? 6 : 0 }}>Direct messages</div>
          {directs.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedId}
              onClick={() => onSelect(conv.id)}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default ConversationList;
