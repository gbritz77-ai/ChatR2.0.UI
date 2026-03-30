import React from "react";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<Props> = ({
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}) => {
  const { tokens } = useTheme();

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onCancel}
    >
      <div
        style={{ background: tokens.bgCard, borderRadius: 14, padding: "24px 28px", width: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8, color: tokens.textMain }}>{title}</div>
        <div style={{ fontSize: "0.875rem", color: tokens.textMuted, marginBottom: 24, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${tokens.border}`, background: "transparent", color: tokens.textMuted, cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: danger ? "#ef4444" : tokens.accent, color: "#fff", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
