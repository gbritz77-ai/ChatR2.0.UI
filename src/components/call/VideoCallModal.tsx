import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import type { RemoteStream } from "../../hooks/useWebRTC";

interface Props {
  callId: string;
  calleeName?: string;
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  isMuted: boolean;
  isCameraOff: boolean;
  pendingInvitees?: { userId: string; name: string }[];
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onHangUp: () => void;
  onInvite?: () => void;
}

const VideoTile: React.FC<{ stream: MediaStream; muted?: boolean; label?: string }> = ({
  stream,
  muted = false,
  label,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#111", flex: 1, minWidth: 0 }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
      {label && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 10,
            fontSize: "0.72rem",
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            padding: "2px 8px",
            borderRadius: 4,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

const VideoCallModal: React.FC<Props> = ({
  callId: _callId,
  calleeName,
  localStream,
  remoteStreams,
  isMuted,
  isCameraOff,
  pendingInvitees = [],
  onToggleMute,
  onToggleCamera,
  onHangUp,
  onInvite,
}) => {
  const { tokens } = useTheme();
  const [elapsed, setElapsed] = useState(0);
  const [dots, setDots] = useState(".");
  const ringCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRinging = remoteStreams.length === 0 && pendingInvitees.length === 0;

  // Animated dots
  useEffect(() => {
    if (!isRinging) return;
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(t);
  }, [isRinging]);

  // Ringing tone (two beeps every 3 seconds)
  useEffect(() => {
    if (!isRinging) {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      ringCtxRef.current?.close().catch(() => {});
      ringCtxRef.current = null;
      return;
    }

    const playRingTone = () => {
      try {
        const ctx = new AudioContext();
        ringCtxRef.current = ctx;
        const beep = (startTime: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(480, startTime);
          gain.gain.setValueAtTime(0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
          osc.start(startTime);
          osc.stop(startTime + 0.4);
        };
        beep(ctx.currentTime);
        beep(ctx.currentTime + 0.5);
      } catch { /* audio blocked */ }
    };

    playRingTone();
    ringIntervalRef.current = setInterval(playRingTone, 3000);
    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      ringCtxRef.current?.close().catch(() => {});
    };
  }, [isRinging]);

  // Call timer — only starts once someone joins
  useEffect(() => {
    if (isRinging) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRinging]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const controlBtn = (onClick: () => void, icon: string, active: boolean, danger = false, tooltip = "") => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <button
        onClick={onClick}
        title={tooltip}
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          background: danger ? "#ef4444" : active ? tokens.accent : "rgba(255,255,255,0.15)",
          color: "#fff",
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s",
        }}
      >
        {icon}
      </button>
      {tooltip && (
        <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
          {tooltip}
        </span>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0a0a0f",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
          {calleeName ?? "Call"}
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 600, opacity: 0.9 }}>
          {isRinging ? "Ringing…" : formatTime(elapsed)}
        </div>
      </div>

      {/* Video grid */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: "0 12px",
          overflow: "hidden",
        }}
      >
        {/* Remote streams */}
        {remoteStreams.map((rs) => (
          <VideoTile key={rs.connectionId} stream={rs.stream} label={rs.userId.slice(0, 8)} />
        ))}

        {/* Pending invitees — ringing tiles */}
        {pendingInvitees.map((p) => (
          <div key={p.userId} style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#1a1a2e", flex: 1, minWidth: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 160 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, animation: "pulse-ring 1.5s ease-in-out infinite" }}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 500 }}>{p.name}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.72rem" }}>Ringing…</div>
          </div>
        ))}

        {/* Ringing / waiting state */}
        {remoteStreams.length === 0 && pendingInvitees.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {/* Pulsing avatar ring */}
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36,
              animation: "pulse-ring 1.5s ease-in-out infinite",
            }}>
              📞
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
              {calleeName ? `Calling ${calleeName}` : "Calling…"}
            </div>
            <div style={{ fontSize: "0.85rem", opacity: 0.6 }}>
              Ringing{dots}
            </div>
            <style>{`
              @keyframes pulse-ring {
                0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.25); }
                50% { box-shadow: 0 0 0 20px rgba(255,255,255,0); }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Local video pip */}
      {localStream && (
        <div
          style={{
            position: "absolute",
            bottom: 90,
            right: 16,
            width: 120,
            height: 90,
            borderRadius: 10,
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
        >
          <VideoTile stream={localStream} muted label="You" />
        </div>
      )}

      {/* Controls bar */}
      <div
        style={{
          padding: "16px 0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {controlBtn(onToggleMute, isMuted ? "🔇" : "🎙️", !isMuted, false, isMuted ? "Unmute" : "Mute")}
        {controlBtn(onToggleCamera, isCameraOff ? "📷" : "📹", !isCameraOff, false, isCameraOff ? "Turn camera on" : "Turn camera off")}
        {onInvite && controlBtn(onInvite, "➕", false, false, "Invite someone")}
        {controlBtn(onHangUp, "📵", false, true, "End call")}
      </div>
    </div>
  );
};

export default VideoCallModal;
