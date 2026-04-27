import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import type { DaySchedule } from '../../types/chat';

const ALL_DAYS: { key: string; label: string }[] = [
  { key: 'Mon', label: 'Monday' },
  { key: 'Tue', label: 'Tuesday' },
  { key: 'Wed', label: 'Wednesday' },
  { key: 'Thu', label: 'Thursday' },
  { key: 'Fri', label: 'Friday' },
  { key: 'Sat', label: 'Saturday' },
  { key: 'Sun', label: 'Sunday' },
];

interface DayRow {
  enabled: boolean;
  from: string;
  to: string;
}

function buildInitialRows(current: DaySchedule[] | null): Record<string, DayRow> {
  const rows: Record<string, DayRow> = {};
  for (const d of ALL_DAYS) {
    const existing = current?.find(s => s.day === d.key);
    rows[d.key] = existing
      ? { enabled: true, from: existing.from, to: existing.to }
      : { enabled: false, from: '09:00', to: '17:00' };
  }
  return rows;
}

interface Props {
  current: DaySchedule[] | null;
  onSave: (schedule: DaySchedule[] | null) => void;
  onClose: () => void;
}

const AvailabilityEditor: React.FC<Props> = ({ current, onSave, onClose }) => {
  const { tokens } = useTheme();
  const [rows, setRows] = useState<Record<string, DayRow>>(() => buildInitialRows(current));

  const toggle = (day: string) =>
    setRows(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }));

  const setFrom = (day: string, val: string) =>
    setRows(prev => ({ ...prev, [day]: { ...prev[day], from: val } }));

  const setTo = (day: string, val: string) =>
    setRows(prev => ({ ...prev, [day]: { ...prev[day], to: val } }));

  const handleSave = () => {
    const schedule: DaySchedule[] = ALL_DAYS
      .filter(d => rows[d.key].enabled)
      .map(d => ({ day: d.key, from: rows[d.key].from, to: rows[d.key].to }));
    onSave(schedule.length > 0 ? schedule : null);
  };

  const inputStyle: React.CSSProperties = {
    background: tokens.bgInput,
    border: `1px solid ${tokens.border}`,
    borderRadius: 6,
    padding: '4px 6px',
    color: tokens.textMain,
    fontSize: '0.8rem',
    width: 74,
  };

  return (
    <div style={{
      position: 'absolute', top: '56px', right: '16px', zIndex: 2000,
      background: tokens.bgCard, border: `1px solid ${tokens.border}`, borderRadius: 12,
      padding: '16px 18px', minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: tokens.textMain }}>My Availability</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.textMuted, fontSize: '1.1rem', lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ALL_DAYS.map(d => {
          const row = rows[d.key];
          return (
            <div key={d.key} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 8,
              background: row.enabled ? tokens.accentSoft : 'transparent',
              opacity: row.enabled ? 1 : 0.55,
              transition: 'background 0.15s, opacity 0.15s',
            }}>
              {/* Toggle checkbox */}
              <button
                type="button"
                onClick={() => toggle(d.key)}
                style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${row.enabled ? tokens.accent : tokens.border}`,
                  background: row.enabled ? tokens.accent : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                }}
              >
                {row.enabled && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* Day label */}
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: tokens.textMain, width: 72, flexShrink: 0 }}>
                {d.label}
              </span>

              {/* Time inputs */}
              <input
                type="time"
                value={row.from}
                disabled={!row.enabled}
                onChange={e => setFrom(d.key, e.target.value)}
                style={{ ...inputStyle, opacity: row.enabled ? 1 : 0.4 }}
              />
              <span style={{ color: tokens.textMuted, fontSize: '0.78rem' }}>–</span>
              <input
                type="time"
                value={row.to}
                disabled={!row.enabled}
                onChange={e => setTo(d.key, e.target.value)}
                style={{ ...inputStyle, opacity: row.enabled ? 1 : 0.4 }}
              />
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={handleSave}
          style={{
            flex: 1, background: tokens.accent, color: tokens.textOnAccent,
            border: 'none', borderRadius: 8, padding: '9px 0',
            fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => onSave(null)}
          style={{
            flex: 1, background: 'transparent', color: tokens.textMuted,
            border: `1px solid ${tokens.border}`, borderRadius: 8, padding: '9px 0',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Clear all
        </button>
      </div>
    </div>
  );
};

export default AvailabilityEditor;
