import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import type { RemoteStream } from "../../hooks/useWebRTC";

interface Props {
  callId: string;
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  isMuted: boolean;
  isCameraOff: boolean;
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
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
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
  callId,
  localStream,
  remoteStreams,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onHangUp,
  onInvite,
}) => {
  const { tokens } = useTheme();
  const [elapsed, setElapsed] = useState(0);

  // Call timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

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
        <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>Call ID: {callId.slice(0, 8)}</div>
        <div style={{ fontSize: "1rem", fontWeight: 600, opacity: 0.9 }}>{formatTime(elapsed)}</div>
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

        {/* If no remote yet, show waiting message */}
        {remoteStreams.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.9rem",
            }}
          >
            Waiting for others to join…
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
