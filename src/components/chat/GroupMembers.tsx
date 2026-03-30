import React, { useEffect, useState } from "react";
import { getGroupMembers, addGroupMember, removeGroupMember, searchUsers, type ChatUserDto } from "../../api/chatApi";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  chatId: string;
  token: string;
  currentUserName: string;
  createdByUserId?: string;
  onRefresh?: () => void;
  onMemberCount?: (count: number) => void;
}

const GroupMembers: React.FC<Props> = ({
  chatId,
  token,
  currentUserName,
  createdByUserId,
  onRefresh,
  onMemberCount,
}) => {
  const { tokens } = useTheme();
  const [members, setMembers] = useState<ChatUserDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<ChatUserDto[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line
  }, [chatId]);

  const loadMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getGroupMembers(chatId, token);
      // Normalize member id property (backend may return userId or id)
      const normalized = data.map((u) => ({
        id: (u as any).id ?? (u as any).userId ?? (u as any).user_id ?? "",
        username: u.username,
        email: u.email ?? null,
        role: (u as any).role ?? "",
      } as ChatUserDto));
      setMembers(normalized);
      if (onMemberCount) onMemberCount(normalized.length);
    } catch (err) {
      setError("Failed to load members");
      console.error(err);
      if (onMemberCount) onMemberCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setUserResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const users = await searchUsers(token, query);
      // Filter out already members
      const filtered = users.filter(
        (u) => !members.some((m) => m.id === u.id)
      );
      setUserResults(filtered);
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleAddMember = async (user: ChatUserDto) => {
    setIsAddingMember(true);
    setError(null);
    try {
      await addGroupMember(chatId, user.id, token);
      setMembers([...members, user]);
      setUserSearch("");
      setUserResults([]);
      setShowAddMember(false);
      onRefresh?.();
    } catch (err) {
      setError("Failed to add member");
      console.error(err);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm("Remove this member?")) return;

    if (!memberId) {
      setError("Invalid member id");
      console.error("handleRemoveMember called with falsy memberId", memberId);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      console.log("Removing member", memberId, "from chat", chatId);
      await removeGroupMember(chatId, memberId, token);
      setMembers(members.filter((m) => m.id !== memberId));
      onRefresh?.();
    } catch (err) {
      setError("Failed to remove member");
      console.error("removeGroupMember failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "12px",
        borderRadius: "8px",
        backgroundColor: tokens.accentSoft,
        border: `1px solid ${tokens.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <button
          type="button"
          onClick={() => setShowAddMember(!showAddMember)}
          style={{
            background: "none",
            border: "none",
            color: tokens.accent,
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          {showAddMember ? "−" : "+"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "6px 8px",
            borderRadius: "4px",
            backgroundColor: "rgba(248, 113, 113, 0.1)",
            color: tokens.danger,
            fontSize: "0.75rem",
            marginBottom: "8px",
          }}
        >
          {error}
        </div>
      )}

      {showAddMember && (
        <div style={{ marginBottom: "8px", paddingBottom: "8px", borderBottom: `1px solid ${tokens.border}` }}>
          <input
            type="text"
            placeholder="Search users..."
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              handleSearchUsers(e.target.value);
            }}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: "4px",
              border: `1px solid ${tokens.border2}`,
              backgroundColor: tokens.bgInput,
              color: tokens.textMain,
              fontSize: "0.8rem",
              boxSizing: "border-box",
              outline: "none",
              marginBottom: "6px",
            }}
          />

          {userSearch.trim() && isSearchingUsers && (
            <div style={{ fontSize: "0.75rem", color: tokens.textMuted }}>
              Searching…
            </div>
          )}

          {userResults.length > 0 && (
            <div
              style={{
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
                  onClick={() => handleAddMember(user)}
                  disabled={isAddingMember}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    background: "transparent",
                    border: "none",
                    borderBottom: `1px solid ${tokens.border}`,
                    color: tokens.textMain,
                    textAlign: "left",
                    cursor: isAddingMember ? "not-allowed" : "pointer",
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
      )}

      {isLoading && members.length === 0 && (
        <div style={{ fontSize: "0.8rem", color: tokens.textMuted }}>
          Loading members…
        </div>
      )}

      {members.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {members.map((member) => (
            <div
              key={member.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                backgroundColor: tokens.accentSoft,
                borderRadius: "4px",
                fontSize: "0.8rem",
              }}
            >
              <span style={{ color: createdByUserId && member.id === createdByUserId ? tokens.accent : tokens.textMain, fontWeight: createdByUserId && member.id === createdByUserId ? 600 : 400 }}>
                {member.username}{createdByUserId && member.id === createdByUserId ? " ★" : ""}
              </span>
              {member.username !== currentUserName && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={isLoading}
                  style={{
                    background: "none",
                    border: "none",
                    color: tokens.danger,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    fontSize: "0.85rem",
                    padding: "0",
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupMembers;
