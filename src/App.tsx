import { useState } from "react";
import { login, setAuthToken } from "./api";
import ChatLayout from "./components/layout/ChatLayout";
import "./styles/chat.css";

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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "#e5e7eb",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "360px",
            padding: "2rem",
            borderRadius: "0.75rem",
            border: "1px solid #1f2937",
            background:
              "radial-gradient(circle at top, rgba(56,189,248,0.15), transparent 55%), #020617",
            boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
          }}
        >
          <h2
            style={{
              marginBottom: "0.25rem",
              fontSize: "1.25rem",
              fontWeight: 600,
            }}
          >
            ChatR2.0 Login
          </h2>
          <p
            style={{
              marginBottom: "1.5rem",
              fontSize: "0.85rem",
              color: "#9ca3af",
            }}
          >
            Sign in with your ChatR credentials to continue.
          </p>

          {error && (
            <div
              style={{
                marginBottom: "0.75rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                backgroundColor: "rgba(248,113,113,0.1)",
                color: "#fecaca",
                fontSize: "0.8rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "0.75rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  fontSize: "0.8rem",
                }}
              >
                Username or Email
              </label>
              <input
                value={usernameOrEmail}
                onChange={(e) => setUser(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 0.6rem",
                  border: "1px solid #374151",
                  fontSize: "0.85rem",
                  backgroundColor: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  fontSize: "0.8rem",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 0.6rem",
                  border: "1px solid #374151",
                  fontSize: "0.85rem",
                  backgroundColor: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                }}
              />
            </div>

            <button
              style={{
                width: "100%",
                marginTop: "0.25rem",
                borderRadius: "999px",
                padding: "0.55rem 1rem",
                border: "none",
                fontSize: "0.9rem",
                fontWeight: 500,
                background:
                  "linear-gradient(to right, #38bdf8, #22c55e, #a855f7)",
                color: "#020617",
                cursor: "pointer",
              }}
              type="submit"
            >
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
