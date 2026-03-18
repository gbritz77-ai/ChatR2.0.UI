import React, { useState } from "react";
import { changePassword } from "../../api";

interface Props {
  onSuccess: () => void;
}

const EyeIcon = ({ visible }: { visible: boolean }) =>
  visible ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

const inputStyle: React.CSSProperties = {
  background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
  padding: "10px 40px 10px 14px", color: "#f1f5f9", fontSize: "0.95rem", width: "100%", boxSizing: "border-box",
};

const toggleStyle: React.CSSProperties = {
  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
  background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, display: "flex",
};

const ChangePasswordModal: React.FC<Props> = ({ onSuccess }) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
            <div style={{ position: "relative" }}>
              <input type={showCurrent ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required style={inputStyle} />
              <button type="button" onClick={() => setShowCurrent((v) => !v)} style={toggleStyle} aria-label={showCurrent ? "Hide" : "Show"}>
                <EyeIcon visible={showCurrent} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>New password</label>
            <div style={{ position: "relative" }}>
              <input type={showNext ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required style={inputStyle} />
              <button type="button" onClick={() => setShowNext((v) => !v)} style={toggleStyle} aria-label={showNext ? "Hide" : "Show"}>
                <EyeIcon visible={showNext} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>Confirm new password</label>
            <div style={{ position: "relative" }}>
              <input type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required style={inputStyle} />
              <button type="button" onClick={() => setShowConfirm((v) => !v)} style={toggleStyle} aria-label={showConfirm ? "Hide" : "Show"}>
                <EyeIcon visible={showConfirm} />
              </button>
            </div>
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
