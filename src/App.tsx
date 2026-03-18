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
    <>
      <ChatLayout
        authToken={token}
        currentUserName={currentUserName}
        onLogout={handleLogout}
        onInviteUser={currentRole === "Master" ? () => setShowInvite(true) : undefined}
      />
      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}
    </>
  );
}
