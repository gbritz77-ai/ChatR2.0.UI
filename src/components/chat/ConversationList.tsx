import React from "react";
import type { Conversation } from "../../types/chat";
import ConversationListItem from "./ConversationListItem";


interface Props {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const ConversationList: React.FC<Props> = ({ conversations, selectedId, onSelect }) => {
  return (
    <div className="conversation-list">
      {conversations.map((conv) => (
        <ConversationListItem
          key={conv.id}
          conversation={conv}
          isSelected={conv.id === selectedId}
          onClick={() => onSelect(conv.id)}
        />
      ))}
    </div>
  );
};

export default ConversationList;
