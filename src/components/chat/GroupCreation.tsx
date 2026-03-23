import React, { useRef, useState } from "react";
import { getGroupAvatarUploadUrl, searchUsers, type ChatUserDto } from "../../api/chatApi";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  onCreateGroup: (groupName: string, memberIds: string[], avatarKey?: string) => void;
  isLoading: boolean;
  token: string;
}

const GroupCreation: React.FC<Props> = ({ onCreateGroup, isLoading, token }) => {
  const { tokens } = useTheme();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<ChatUserDto[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<ChatUserDto[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Avatar state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "6px 8px", borderRadius: "4px",
    border: `1px solid ${tokens.border2}`, backgroundColor: tokens.bgInput,
    color: tokens.textMain, fontSize: "0.8rem", boxSizing: "border-box", outline: "none",
  };

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) { setUserResults([]); return; }
    setIsSearchingUsers(true);
    try {
      const users = await searchUsers(token, query);
      setUserResults(users.filter((u) => !selectedMembers.some((m) => m.id === u.id)));
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleSelectUser = (user: ChatUserDto) => {
    setSelectedMembers([...selectedMembers, user]);
    setUserSearch("");
    setUserResults([]);
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== userId));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAvatarError(null);
    setAvatarPreview(URL.createObjectURL(file));
    setIsUploadingAvatar(true);
    try {
      const { uploadUrl, key } = await getGroupAvatarUploadUrl(token, file.type || "image/jpeg");
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
      setAvatarKey(key);
    } catch (err) {
      console.error("Avatar upload failed", err);
      setAvatarError("Image upload failed. Try again.");
      setAvatarPreview(null);
      setAvatarKey(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) { alert("Please enter a group name"); return; }
    if (selectedMembers.length === 0) { alert("Please add at least one member"); return; }
    onCreateGroup(groupName, selectedMembers.map((m) => m.id), avatarKey ?? undefined);
    setGroupName("");
    setSelectedMembers([]);
    setAvatarPreview(null);
    setAvatarKey(null);
  };

  return (
    <div style={{
      padding: "12px", borderRadius: "8px",
      backgroundColor: tokens.accentSoft, border: `1px solid ${tokens.border}`, marginBottom: "12px",
    }}>
      <h3 style={{ fontSize: "0.9rem", marginTop: 0, marginBottom: "8px", color: tokens.textMain }}>
        Create Group Chat
      </h3>

      {/* Group avatar picker */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
            border: `2px dashed ${tokens.border2}`, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", background: tokens.bgInput, position: "relative",
          }}
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Group avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "1.4rem", opacity: 0.5 }}>🖼</span>
          )}
          {isUploadingAvatar && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.6rem", color: "#fff",
            }}>…</div>
          )}
        </div>
        <div>
          <div style={{ fontSize: "0.75rem", color: tokens.textMuted }}>Group image (optional)</div>
          <button type="button" onClick={() => fileInputRef.current?.click()}
            style={{ fontSize: "0.72rem", color: tokens.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            {avatarPreview ? "Change" : "Upload image"}
          </button>
          {avatarError && <div style={{ fontSize: "0.7rem", color: tokens.danger }}>{avatarError}</div>}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
      </div>

      <div style={{ marginBottom: "8px" }}>
        <input
          type="text" placeholder="Group name..." value={groupName}
          onChange={(e) => setGroupName(e.target.value)} style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: "8px" }}>
        <input
          type="text" placeholder="Search and add members..." value={userSearch}
          onChange={(e) => { setUserSearch(e.target.value); void handleSearchUsers(e.target.value); }}
          style={inputStyle}
        />
        {userSearch.trim() && isSearchingUsers && (
          <div style={{ fontSize: "0.75rem", color: tokens.textMuted, marginTop: "4px" }}>Searching…</div>
        )}
        {userSearch.trim() && !isSearchingUsers && userResults.length === 0 && (
          <div style={{ fontSize: "0.75rem", color: tokens.textMuted, marginTop: "4px" }}>No users found</div>
        )}
        {userResults.length > 0 && (
          <div style={{
            marginTop: "4px", maxHeight: "150px", overflowY: "auto",
            backgroundColor: tokens.bgCard, borderRadius: "4px", border: `1px solid ${tokens.border2}`,
          }}>
            {userResults.map((user) => (
              <button key={user.id} type="button" onClick={() => handleSelectUser(user)}
                style={{
                  width: "100%", padding: "6px 8px", background: "transparent", border: "none",
                  borderBottom: `1px solid ${tokens.border}`, color: tokens.textMain,
                  textAlign: "left", cursor: "pointer", fontSize: "0.8rem",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = tokens.accentSoft; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {selectedMembers.map((member) => (
              <div key={member.id} style={{
                display: "flex", alignItems: "center", gap: "4px",
                backgroundColor: tokens.accentSoft, border: `1px solid ${tokens.border}`,
                padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem", color: tokens.textMain,
              }}>
                <span>{member.username}</span>
                <button type="button" onClick={() => handleRemoveMember(member.id)}
                  style={{ background: "none", border: "none", color: tokens.danger, cursor: "pointer", fontSize: "0.85rem", padding: "0" }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={handleCreateGroup} disabled={isLoading || isUploadingAvatar}
        style={{
          width: "100%", padding: "6px 12px", borderRadius: "4px", border: "none",
          backgroundColor: tokens.accent, color: tokens.textOnAccent,
          fontSize: "0.8rem", fontWeight: 500,
          cursor: (isLoading || isUploadingAvatar) ? "not-allowed" : "pointer",
          opacity: (isLoading || isUploadingAvatar) ? 0.6 : 1,
        }}>
        {isLoading ? "Creating..." : isUploadingAvatar ? "Uploading image…" : "Create Group"}
      </button>
    </div>
  );
};

export default GroupCreation;
