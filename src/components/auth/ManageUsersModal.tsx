import React, { useEffect, useState } from "react";
import { listAllUsers, updateUser, deleteUser, setUserPassword, ManagedUser } from "../../api";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  onClose: () => void;
  onInvite: () => void;
}

const ROLES = ["Staff", "Admin"];
const GROUPS = ["", "Medical", "Property", "Legal", "Media", "Client", "Crystal Clara"];

// ── sub-modal: edit user ────────────────────────────────────────────────────
interface EditModalProps {
  user: ManagedUser;
  tokens: ReturnType<typeof useTheme>["tokens"];
  onSave: (id: string, data: { username: string; email: string; role: string; group?: string }) => Promise<void>;
  onClose: () => void;
}

const EditUserModal: React.FC<EditModalProps> = ({ user, tokens, onSave, onClose }) => {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [group, setGroup] = useState(user.group ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    background: tokens.bgInput, border: `1px solid ${tokens.border2}`, borderRadius: 8,
    padding: "9px 12px", color: tokens.textMain, fontSize: "0.9rem", width: "100%", boxSizing: "border-box",
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setSaving(true);
      await onSave(user.id, { username: username.trim(), email: email.trim(), role, group: group || undefined });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10100 }}>
      <div style={{ background: tokens.bgMain, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: "28px 24px", width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ color: tokens.textMain, fontSize: "1rem", margin: 0 }}>Edit user</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: tokens.textMuted, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        {error && <div style={{ background: "rgba(248,113,113,0.12)", color: tokens.danger, padding: "8px 12px", borderRadius: 8, marginBottom: 14, fontSize: "0.82rem" }}>{error}</div>}
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ color: tokens.textMuted, fontSize: "0.78rem" }}>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required style={inputStyle} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ color: tokens.textMuted, fontSize: "0.78rem" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ color: tokens.textMuted, fontSize: "0.78rem" }}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ color: tokens.textMuted, fontSize: "0.78rem" }}>Group</label>
            <select value={group} onChange={e => setGroup(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {GROUPS.map(g => <option key={g} value={g}>{g || "— No group —"}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: saving ? tokens.accentDisabled : tokens.accent, color: tokens.textOnAccent, fontWeight: 600, fontSize: "0.88rem", cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${tokens.border2}`, background: "transparent", color: tokens.textMuted, fontSize: "0.88rem", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── sub-modal: set password ─────────────────────────────────────────────────
interface SetPwProps {
  user: ManagedUser;
  tokens: ReturnType<typeof useTheme>["tokens"];
  onSave: (id: string, pw: string) => Promise<void>;
  onClose: () => void;
}

const SetPasswordModal: React.FC<SetPwProps> = ({ user, tokens, onSave, onClose }) => {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const inputStyle: React.CSSProperties = {
    background: tokens.bgInput, border: `1px solid ${tokens.border2}`, borderRadius: 8,
    padding: "9px 12px", color: tokens.textMain, fontSize: "0.9rem", width: "100%", boxSizing: "border-box",
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setError("Passwords do not match."); return; }
    try {
      setSaving(true);
      await onSave(user.id, pw);
      setDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to set password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10100 }}>
      <div style={{ background: tokens.bgMain, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: "28px 24px", width: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ color: tokens.textMain, fontSize: "1rem", margin: 0 }}>Set password — {user.username}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: tokens.textMuted, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        {done ? (
          <div style={{ color: "#16a34a", fontSize: "0.9rem", marginBottom: 16 }}>Password updated successfully.</div>
        ) : (
          <>
            {error && <div style={{ background: "rgba(248,113,113,0.12)", color: tokens.danger, padding: "8px 12px", borderRadius: 8, marginBottom: 14, fontSize: "0.82rem" }}>{error}</div>}
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ color: tokens.textMuted, fontSize: "0.78rem" }}>New password</label>
                <input type="password" value={pw} onChange={e => setPw(e.target.value)} required autoComplete="new-password" style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ color: tokens.textMuted, fontSize: "0.78rem" }}>Confirm password</label>
                <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} required autoComplete="new-password" style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: saving ? tokens.accentDisabled : tokens.accent, color: tokens.textOnAccent, fontWeight: 600, fontSize: "0.88rem", cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : "Set password"}
                </button>
                <button type="button" onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${tokens.border2}`, background: "transparent", color: tokens.textMuted, fontSize: "0.88rem", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
        {done && (
          <button onClick={onClose} style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "none", background: tokens.accent, color: tokens.textOnAccent, fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}>
            Close
          </button>
        )}
      </div>
    </div>
  );
};

// ── main modal ──────────────────────────────────────────────────────────────
const ManageUsersModal: React.FC<Props> = ({ onClose, onInvite }) => {
  const { tokens } = useTheme();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [setPwUser, setSetPwUser] = useState<ManagedUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await listAllUsers();
      setUsers(data);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (id: string, data: { username: string; email: string; role: string; group?: string }) => {
    await updateUser(id, data);
    await load();
  };

  const handleSetPw = async (id: string, pw: string) => {
    await setUserPassword(id, pw);
  };

  const handleDelete = async (user: ManagedUser) => {
    if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    setDeletingId(user.id);
    try {
      await deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? "Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = users.filter(u =>
    !search.trim() ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.group ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const roleBadge = (role: string) => {
    const color = role === "Admin" ? "#7c3aed" : "#374151";
    return (
      <span style={{ fontSize: "0.72rem", fontWeight: 600, background: role === "Admin" ? "rgba(124,58,237,0.12)" : "rgba(107,114,128,0.12)", color, borderRadius: 4, padding: "2px 7px" }}>
        {role}
      </span>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: tokens.bgOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9500 }}>
      <div style={{ background: tokens.bgMain, border: `1px solid ${tokens.border}`, borderRadius: 14, width: "min(680px, 96vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.5)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ color: tokens.textMain, fontSize: "1.05rem", margin: 0 }}>Manage users</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={onInvite}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: tokens.accent, color: tokens.textOnAccent, fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}
            >
              + Invite user
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: tokens.textMuted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 24px", borderBottom: `1px solid ${tokens.border}`, flexShrink: 0 }}>
          <input
            placeholder="Search by name, email or group…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", background: tokens.bgInput, border: `1px solid ${tokens.border2}`, borderRadius: 8, padding: "8px 12px", color: tokens.textMain, fontSize: "0.88rem" }}
          />
        </div>

        {/* User list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && (
            <div style={{ padding: 32, textAlign: "center", color: tokens.textMuted, fontSize: "0.9rem" }}>Loading…</div>
          )}
          {error && (
            <div style={{ padding: 24, color: tokens.danger, fontSize: "0.9rem" }}>{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: tokens.textMuted, fontSize: "0.9rem" }}>No users found.</div>
          )}
          {!loading && !error && filtered.map(user => (
            <div key={user.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "13px 24px",
              borderBottom: `1px solid ${tokens.border}`,
            }}>
              {/* Avatar circle */}
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: tokens.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: tokens.textOnAccent, fontWeight: 700, fontSize: "0.9rem", flexShrink: 0,
              }}>
                {user.username.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ color: tokens.textMain, fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.username}
                  </span>
                  {roleBadge(user.role)}
                </div>
                <div style={{ color: tokens.textMuted, fontSize: "0.78rem", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.email}{user.group ? ` · ${user.group}` : ""}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => setEditUser(user)}
                  title="Edit user"
                  style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${tokens.border2}`, background: "transparent", color: tokens.textMuted, fontSize: "0.78rem", cursor: "pointer" }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setSetPwUser(user)}
                  title="Set password"
                  style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${tokens.border2}`, background: "transparent", color: tokens.textMuted, fontSize: "0.78rem", cursor: "pointer" }}
                >
                  Password
                </button>
                <button
                  onClick={() => handleDelete(user)}
                  disabled={deletingId === user.id}
                  title="Delete user"
                  style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid rgba(239,68,68,0.4)`, background: "transparent", color: tokens.danger, fontSize: "0.78rem", cursor: deletingId === user.id ? "not-allowed" : "pointer" }}
                >
                  {deletingId === user.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: `1px solid ${tokens.border}`, color: tokens.textMuted, fontSize: "0.78rem", flexShrink: 0 }}>
          {filtered.length} user{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Sub-modals */}
      {editUser && (
        <EditUserModal
          user={editUser}
          tokens={tokens}
          onSave={handleUpdate}
          onClose={() => setEditUser(null)}
        />
      )}
      {setPwUser && (
        <SetPasswordModal
          user={setPwUser}
          tokens={tokens}
          onSave={handleSetPw}
          onClose={() => setSetPwUser(null)}
        />
      )}
    </div>
  );
};

export default ManageUsersModal;
