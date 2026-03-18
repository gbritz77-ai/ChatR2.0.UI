import { useState } from "react";
import { login, setAuthToken } from "./api";
import ChatLayout from "./components/layout/ChatLayout";
import ChangePasswordModal from "./components/auth/ChangePasswordModal";
import InviteUserModal from "./components/auth/InviteUserModal";
import { useTheme } from "./context/ThemeContext";
import "./styles/chat.css";
import "./styles/auth.css";


export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [usernameOrEmail, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
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
      setCurrentUserId(res.userId);
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="auth-header">
              <h2>ChatR2.0</h2>
              <p>Sign in to continue.</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: "999px",
                cursor: "pointer",
                fontSize: "1rem",
                padding: "6px 10px",
                color: "inherit",
                flexShrink: 0,
              }}
            >
              {theme === "dark" ? "☀ Light" : "🌙 Dark"}
            </button>
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
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: "2.5rem", width: "100%", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, display: "flex" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
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
    <>
      <ChatLayout
        authToken={token}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        onLogout={handleLogout}
        onInviteUser={currentRole === "Master" ? () => setShowInvite(true) : undefined}
      />
      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}
    </>
  );
}
