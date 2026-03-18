import React, { useState } from "react";
import { searchUsers, type ChatUserDto } from "../../api/chatApi";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  onCreateGroup: (groupName: string, memberIds: string[]) => void;
  isLoading: boolean;
  token: string;
}

const GroupCreation: React.FC<Props> = ({ onCreateGroup, isLoading, token }) => {
  const { tokens } = useTheme();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<ChatUserDto[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "6px 8px", borderRadius: "4px",
    border: `1px solid ${tokens.border2}`, backgroundColor: tokens.bgInput,
    color: tokens.textMain, fontSize: "0.8rem", boxSizing: "border-box", outline: "none",
  };

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setUserResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const users = await searchUsers(token, query);
      // Filter out already selected members
      const filtered = users.filter(
        (u) => !selectedMembers.includes(u.id)
      );
      setUserResults(filtered);
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleSelectUser = (user: ChatUserDto) => {
    setSelectedMembers([...selectedMembers, user.id]);
    setUserSearch("");
    setUserResults([]);
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter((id) => id !== userId));
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    if (selectedMembers.length === 0) {
      alert("Please add at least one member");
      return;
    }

    onCreateGroup(groupName, selectedMembers);
    setGroupName("");
    setSelectedMembers([]);
  };

  return (
    <div
      style={{
        padding: "12px",
        borderRadius: "8px",
        backgroundColor: tokens.accentSoft,
        border: `1px solid ${tokens.border}`,
        marginBottom: "12px",
      }}
    >
      <h3 style={{ fontSize: "0.9rem", marginTop: 0, marginBottom: "8px", color: tokens.textMain }}>
        Create Group Chat
      </h3>

      <div style={{ marginBottom: "8px" }}>
        <input
          type="text"
          placeholder="Group name..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: "8px" }}>
        <input
          type="text"
          placeholder="Search and add members..."
          value={userSearch}
          onChange={(e) => {
            setUserSearch(e.target.value);
            handleSearchUsers(e.target.value);
          }}
          style={inputStyle}
        />

        {userSearch.trim() && isSearchingUsers && (
          <div style={{ fontSize: "0.75rem", color: tokens.textMuted, marginTop: "4px" }}>
            Searching…
          </div>
        )}

        {userSearch.trim() &&
          !isSearchingUsers &&
          userResults.length === 0 && (
            <div style={{ fontSize: "0.75rem", color: tokens.textMuted, marginTop: "4px" }}>
              No users found
            </div>
          )}

        {userResults.length > 0 && (
          <div
            style={{
              marginTop: "4px",
              maxHeight: "150px",
              overflowY: "auto",
              backgroundColor: tokens.bgCard,
              borderRadius: "4px",
              border: `1px solid ${tokens.border2}`,
            }}
          >
            {userResults.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectUser(user)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `1px solid ${tokens.border}`,
                  color: tokens.textMain,
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.accentSoft;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {user.username}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedMembers.length > 0 && (
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "0.75rem", color: tokens.textMuted, marginBottom: "4px" }}>
            Selected Members ({selectedMembers.length}):
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
            }}
          >
            {selectedMembers.map((memberId) => {
              const user = userResults.find((u) => u.id === memberId);
              return (
                <div
                  key={memberId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    backgroundColor: tokens.accentSoft,
                    border: `1px solid ${tokens.border}`,
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    color: tokens.textMain,
                  }}
                >
                  <span>{user?.username || memberId}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(memberId)}
                    style={{
                      background: "none",
                      border: "none",
                      color: tokens.danger,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      padding: "0",
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleCreateGroup}
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "6px 12px",
          borderRadius: "4px",
          border: "none",
          backgroundColor: tokens.accent,
          color: tokens.textOnAccent,
          fontSize: "0.8rem",
          fontWeight: 500,
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? "Creating..." : "Create Group"}
      </button>
    </div>
  );
};

export default GroupCreation;
