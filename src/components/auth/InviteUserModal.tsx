import React, { useState } from "react";
import { inviteUser } from "../../api";

interface Props {
  onClose: () => void;
}

const InviteUserModal: React.FC<Props> = ({ onClose }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      await inviteUser(username.trim(), email.trim());
      setSuccess(`Invitation sent to ${email.trim()}`);
      setUsername("");
      setEmail("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to send invitation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000,
    }}>
      <div style={{
        background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 12,
        padding: "32px 28px", width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ color: "#e0f2fe", fontSize: "1.1rem", margin: 0 }}>Invite user</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 20, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        <p style={{ color: "#9ca3af", fontSize: "0.82rem", marginBottom: 20 }}>
          The user will receive an email with the app URL and a temporary password (<strong style={{ color: "#cbd5e1" }}>ImpTrack@2020</strong>). They will be prompted to change it on first login.
        </p>

        {error && (
          <div style={{ background: "rgba(248,113,113,0.12)", color: "#fecaca", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.82rem" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.82rem" }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ color: "#cbd5e1", fontSize: "0.82rem" }}>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john.smith"
              required
              style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: "0.9rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ color: "#cbd5e1", fontSize: "0.82rem" }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@company.com"
              required
              style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: "0.9rem" }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                background: saving ? "#164e63" : "#0369a1", color: "#fff",
                fontSize: "0.9rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Sending…" : "Send invite"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px", borderRadius: 8, border: "1px solid #334155",
                background: "transparent", color: "#9ca3af", fontSize: "0.9rem", cursor: "pointer",
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
