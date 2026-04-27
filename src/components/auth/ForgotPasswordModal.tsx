import React, { useState } from "react";
import { forgotPassword } from "../../api";

interface Props {
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<Props> = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 12px", fontSize: 14,
    border: "1.5px solid #d1d5db", borderRadius: 8,
    background: "#f9fafb", color: "#111827", outline: "none",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("Please enter your email address."); return; }

    try {
      setLoading(true);
      await forgotPassword(email.trim());
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
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
        <h2 style={{ color: "#111827", fontSize: "1.15rem", fontWeight: 700, marginBottom: 8 }}>
          Forgot password
        </h2>

        {done ? (
          <>
            <p style={{ color: "#374151", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              If that email address is registered, a reset link has been sent.<br />
              Check your inbox — the link is valid for 1 hour.
            </p>
            <button
              onClick={onClose}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
                background: "#7c3aed", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
              Enter your email address and we'll send you a link to reset your password.
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
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#7c3aed"}
                  onBlur={e => e.target.style.borderColor = "#d1d5db"}
                />
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
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", fontSize: 13 }}
              >
                Back to login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
