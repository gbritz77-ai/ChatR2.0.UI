import { useState } from "react";
import { login, setAuthToken } from "./api";
import ChatLayout from "./components/layout/ChatLayout";
import ChangePasswordModal from "./components/auth/ChangePasswordModal";
import InviteUserModal from "./components/auth/InviteUserModal";
import "./styles/chat.css";
import "./styles/auth.css";


export default function App() {
  const [usernameOrEmail, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [token, setTokenState] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentRole, setCurrentRole] = useState<string>("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log("VITE_API_BASE =", import.meta.env.VITE_API_BASE);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await login(usernameOrEmail, password);
      setAuthToken(res.token);
      setTokenState(res.token);
      setCurrentUserName(res.username);
      setCurrentRole(res.role);
      setMustChangePassword(res.mustChangePassword);
    } catch (err) {
      console.error(err);
      setError("Invalid login");
    }
  };

  const handleLogout = () => {
    setAuthToken("");
    setTokenState(null);
    setCurrentUserName("");
    setCurrentRole("");
    setMustChangePassword(false);
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUserName");
  };

  // ---------- LOGIN SCREEN ----------
  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <h2>ChatR2.0</h2>
            <p>Sign in to continue.</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="field">
              <label>Username or Email</label>
              <input
                value={usernameOrEmail}
                onChange={(e) => setUser(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button className="auth-btn" type="submit">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------- FORCE PASSWORD CHANGE ----------
  if (mustChangePassword) {
    return (
      <ChangePasswordModal
        onSuccess={() => setMustChangePassword(false)}
      />
    );
  }

  // ---------- MAIN CHAT UI AFTER LOGIN ----------
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 16px",
          background: "#020617",
          color: "#9ca3af",
          fontSize: "0.8rem",
          borderBottom: "1px solid #111827",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {currentRole === "Master" && (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              style={{
                borderRadius: "999px",
                border: "1px solid #0369a1",
                padding: "6px 16px",
                background: "transparent",
                color: "#38bdf8",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              + Invite user
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{
              borderRadius: "999px",
              border: "1px solid #374151",
              padding: "6px 16px",
              background: "transparent",
              color: "#e5e7eb",
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            type="button"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#38bdf8";
              e.currentTarget.style.color = "#38bdf8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#374151";
              e.currentTarget.style.color = "#e5e7eb";
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <ChatLayout
          authToken={token}
          currentUserName={currentUserName}
          onLogout={handleLogout}
        />
      </div>

      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
