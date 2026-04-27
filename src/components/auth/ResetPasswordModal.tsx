import React, { useState } from "react";
import { resetPassword } from "../../api";

interface Props {
  token: string;
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

const ResetPasswordModal: React.FC<Props> = ({ token, onSuccess }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 40px 10px 12px", fontSize: 14,
    border: "1.5px solid #d1d5db", borderRadius: 8,
    background: "#f9fafb", color: "#111827", outline: "none",
  };

  const toggleStyle: React.CSSProperties = {
    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, display: "flex",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirm) { setError("Passwords do not match."); return; }

    try {
      setLoading(true);
      await resetPassword(token, newPassword);
      setDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "This reset link is invalid or has expired. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{
        background: "#ffffff", borderRadius: 12, padding: "32px 28px",
        width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      }}>
        {done ? (
          <>
            <h2 style={{ color: "#111827", fontSize: "1.15rem", fontWeight: 700, marginBottom: 12 }}>
              Password updated
            </h2>
            <p style={{ color: "#374151", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <button
              onClick={onSuccess}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
                background: "#7c3aed", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}
            >
              Go to login
            </button>
          </>
        ) : (
          <>
            <h2 style={{ color: "#111827", fontSize: "1.15rem", fontWeight: 700, marginBottom: 8 }}>
              Set new password
            </h2>
            <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
              Choose a strong password — at least 8 characters.
            </p>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
                color: "#b91c1c", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 14,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  New password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "#7c3aed"}
                    onBlur={e => e.target.style.borderColor = "#d1d5db"}
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)} style={toggleStyle} aria-label={showNew ? "Hide" : "Show"}>
                    <EyeIcon visible={showNew} />
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Confirm new password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "#7c3aed"}
                    onBlur={e => e.target.style.borderColor = "#d1d5db"}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} style={toggleStyle} aria-label={showConfirm ? "Hide" : "Show"}>
                    <EyeIcon visible={showConfirm} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
                  background: loading ? "#a78bfa" : "#7c3aed", color: "#fff",
                  fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {loading && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ animation: "spin 0.8s linear infinite" }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                )}
                {loading ? "Saving…" : "Set new password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordModal;
