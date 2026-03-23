import React, { useState } from "react";
import type { Conversation } from "../../types/chat";
import ConversationListItem from "./ConversationListItem";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const ConversationList: React.FC<Props> = ({ conversations, selectedId, onSelect }) => {
  const { tokens } = useTheme();
  const [groupFilter, setGroupFilter] = useState<string>("All");

  const groupChats = conversations.filter((c) => c.type === "group");
  const directs = conversations.filter((c) => c.type === "direct");

  // Derive unique groups from direct message conversations
  const availableGroups = Array.from(
    new Set(directs.map((c) => c.otherUserGroup).filter(Boolean) as string[])
  ).sort();

  // Apply group filter to direct messages
  const filteredDirects = groupFilter === "All"
    ? directs
    : directs.filter((c) => c.otherUserGroup === groupFilter);

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
      {groupChats.length > 0 && (
        <>
          <div style={sectionLabel}>Groups</div>
          {groupChats.map((conv) => (
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 6px", marginTop: groupChats.length > 0 ? 6 : 0 }}>
            <span style={{ ...sectionLabel, padding: 0 }}>Direct messages</span>
            {availableGroups.length > 0 && (
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                style={{
                  fontSize: "0.72rem",
                  background: tokens.bgCard,
                  color: tokens.textMuted,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 6,
                  padding: "2px 6px",
                  cursor: "pointer",
                  outline: "none",
                  maxWidth: 110,
                }}
              >
                <option value="All">All</option>
                {availableGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            )}
          </div>
          {filteredDirects.length === 0 ? (
            <div style={{ padding: "6px 14px", fontSize: "0.78rem", opacity: 0.5 }}>
              No users in this group
            </div>
          ) : (
            filteredDirects.map((conv) => (
              <ConversationListItem
                key={conv.id}
                conversation={conv}
                isSelected={conv.id === selectedId}
                onClick={() => onSelect(conv.id)}
              />
            ))
          )}
        </>
      )}
    </div>
  );
};

export default ConversationList;
