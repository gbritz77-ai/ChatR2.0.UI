import React, { useEffect, useState } from "react";
import { getGroupMembers, addGroupMember, removeGroupMember, searchUsers, type ChatUserDto } from "../../api/chatApi";

interface Props {
  chatId: string;
  token: string;
  currentUserName: string;
  onRefresh?: () => void;
  onMemberCount?: (count: number) => void;
}

const GroupMembers: React.FC<Props> = ({
  chatId,
  token,
  currentUserName,
  onRefresh,
  onMemberCount,
}) => {
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
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        border: "1px solid rgba(34, 197, 94, 0.3)",
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
            color: "#38bdf8",
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
            color: "#fecaca",
            fontSize: "0.75rem",
            marginBottom: "8px",
          }}
        >
          {error}
        </div>
      )}

      {showAddMember && (
        <div style={{ marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid rgba(34, 197, 94, 0.2)" }}>
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
              border: "1px solid #374151",
              backgroundColor: "#020617",
              color: "#e5e7eb",
              fontSize: "0.8rem",
              boxSizing: "border-box",
              outline: "none",
              marginBottom: "6px",
            }}
          />

          {userSearch.trim() && isSearchingUsers && (
            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              Searching…
            </div>
          )}

          {userResults.length > 0 && (
            <div
              style={{
                maxHeight: "150px",
                overflowY: "auto",
                backgroundColor: "#1a1f35",
                borderRadius: "4px",
                border: "1px solid #374151",
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
                    borderBottom: "1px solid #374151",
                    color: "#e5e7eb",
                    textAlign: "left",
                    cursor: isAddingMember ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(56, 189, 248, 0.2)";
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
        <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
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
                backgroundColor: "rgba(15, 23, 42, 0.5)",
                borderRadius: "4px",
                fontSize: "0.8rem",
              }}
            >
              <span style={{ color: "#e5e7eb" }}>
                {member.username}
              </span>
              {member.username !== currentUserName && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={isLoading}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
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
