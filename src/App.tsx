import { useState } from "react";
import { login, setAuthToken } from "./api";
import ChatLayout from "./components/layout/ChatLayout";
import "./styles/chat.css";
import "./styles/auth.css";


export default function App() {
  const [usernameOrEmail, setUser] = useState("admin1");
  const [password, setPassword] = useState("Password123");
  const [token, setTokenState] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  console.log("VITE_API_BASE =", import.meta.env.VITE_API_BASE);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await login(usernameOrEmail, password);
      setAuthToken(res.token);
      setTokenState(res.token);
      setCurrentUserName(usernameOrEmail);
    } catch (err) {
      console.error(err);
      setError("Invalid login");
    }
  };

  const handleLogout = () => {
    setAuthToken("");
    setTokenState(null);
    setCurrentUserName("");
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

      <div style={{ flex: 1 }}>
        {/* ✅ ChatLayout now always receives required props */}
        <ChatLayout
          authToken={token}
          currentUserName={currentUserName}
          onLogout={handleLogout}
        />

      </div>
    </div>
  );
}
