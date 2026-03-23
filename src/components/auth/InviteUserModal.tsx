import React, { useState } from "react";
import { inviteUser } from "../../api";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  onClose: () => void;
}

const InviteUserModal: React.FC<Props> = ({ onClose }) => {
  const { tokens } = useTheme();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [group, setGroup] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const GROUPS = ["Medical", "Property", "Legal", "Media", "Client", "Crystal Clara"];

  const inputStyle: React.CSSProperties = {
    background: tokens.bgInput, border: `1px solid ${tokens.border2}`, borderRadius: 8,
    padding: "9px 12px", color: tokens.textMain, fontSize: "0.9rem",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim() || !email.trim()) {
      setError("Username and email are required.");
      return;
    }

    try {
      setSaving(true);
      const res = await inviteUser(username.trim(), email.trim(), group || undefined);
      if (res.message.includes("could not be sent")) {
        setError(res.message);
      } else {
        setSuccess(res.message);
      }
      setUsername("");
      setEmail("");
      setGroup("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to send invitation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: tokens.bgOverlay,
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000,
    }}>
      <div style={{
        background: tokens.bgMain, border: `1px solid ${tokens.border}`, borderRadius: 12,
        padding: "32px 28px", width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ color: tokens.textMain, fontSize: "1.1rem", margin: 0 }}>Invite user</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: tokens.textMuted, fontSize: 20, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        <p style={{ color: tokens.textMuted, fontSize: "0.82rem", marginBottom: 20 }}>
          The user will receive an email with the app URL and a temporary password (<strong style={{ color: tokens.textMain }}>Outsec@2026</strong>). They will be prompted to change it on first login.
        </p>

        {error && (
          <div style={{ background: "rgba(248,113,113,0.12)", color: tokens.danger, padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.82rem" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "rgba(16,185,129,0.12)", color: "#16a34a", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.82rem" }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ color: tokens.textMain, fontSize: "0.82rem" }}>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john.smith"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ color: tokens.textMain, fontSize: "0.82rem" }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@company.com"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ color: tokens.textMain, fontSize: "0.82rem" }}>Group</label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">— Select a group —</option>
              {GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                background: saving ? tokens.accentDisabled : tokens.accent, color: tokens.textOnAccent,
                fontSize: "0.9rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Sending…" : "Send invite"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px", borderRadius: 8, border: `1px solid ${tokens.border2}`,
                background: "transparent", color: tokens.textMuted, fontSize: "0.9rem", cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteUserModal;
