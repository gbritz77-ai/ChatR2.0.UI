import React, { useState } from "react";
import { changePassword } from "../../api";

interface Props {
  onSuccess: () => void;
}

const ChangePasswordModal: React.FC<Props> = ({ onSuccess }) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSaving(true);
      await changePassword(current, next);
      onSuccess();
    } catch {
      setError("Failed to change password. Check your current password and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{
        background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 12,
        padding: "36px 32px", width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        <h2 style={{ color: "#e0f2fe", marginBottom: 8, fontSize: "1.25rem" }}>
          Set your password
        </h2>
        <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: 24 }}>
          You must change your temporary password before continuing.
        </p>

        {error && (
          <div style={{ background: "rgba(248,113,113,0.12)", color: "#fecaca", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>Current (temporary) password</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
              style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: "0.95rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>New password</label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
              style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: "0.95rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: "0.95rem" }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 8, padding: "12px 0", borderRadius: 8, border: "none",
              background: saving ? "#164e63" : "#0369a1", color: "#fff",
              fontSize: "0.95rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
