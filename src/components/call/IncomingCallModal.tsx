import React, { useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  callerName: string;
  groupName?: string;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallModal: React.FC<Props> = ({ callerName, groupName, onAccept, onReject }) => {
  const { tokens } = useTheme();

  // Play a ringing tone using Web Audio API
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let stopped = false;
    let timeout: ReturnType<typeof setTimeout>;

    const ring = () => {
      if (stopped) return;
      ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 480;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
      timeout = setTimeout(ring, 2000);
    };

    ring();
    return () => {
      stopped = true;
      clearTimeout(timeout);
      ctx?.close();
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: tokens.bgCard,
          borderRadius: 20,
          padding: "36px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          minWidth: 280,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          border: `1px solid ${tokens.border}`,
        }}
      >
        {/* Pulsing avatar ring */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: tokens.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            marginBottom: 8,
            animation: "pulse-ring 1.5s ease-in-out infinite",
          }}
        >
          📞
        </div>

        <div style={{ fontSize: "0.8rem", opacity: 0.6, color: tokens.textMuted }}>
          {groupName ? "Incoming group video call" : "Incoming video call"}
        </div>
        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: tokens.textMain }}>
          {groupName ?? callerName}
        </div>
        {groupName && (
          <div style={{ fontSize: "0.85rem", color: tokens.textMuted }}>
            started by {callerName}
          </div>
        )}

        <div style={{ display: "flex", gap: 20, marginTop: 24 }}>
          {/* Reject */}
          <button
            onClick={onReject}
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              border: "none",
              background: "#ef4444",
              color: "#fff",
              fontSize: 24,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(239,68,68,0.4)",
            }}
            title="Decline"
          >
            📵
          </button>

          {/* Accept */}
          <button
            onClick={onAccept}
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              border: "none",
              background: "#22c55e",
              color: "#fff",
              fontSize: 24,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(34,197,94,0.4)",
            }}
            title="Accept"
          >
            📹
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          50% { box-shadow: 0 0 0 16px rgba(99,102,241,0); }
        }
      `}</style>
    </div>
  );
};

export default IncomingCallModal;
