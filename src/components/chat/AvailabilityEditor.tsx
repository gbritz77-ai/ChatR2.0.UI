import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  current: { days: string; from: string; to: string } | null;
  onSave: (days: string | null, from: string | null, to: string | null) => void;
  onClose: () => void;
}

const AvailabilityEditor: React.FC<Props> = ({ current, onSave, onClose }) => {
  const { tokens } = useTheme();
  const [selectedDays, setSelectedDays] = useState<string[]>(
    current?.days ? current.days.split(',').map(d => d.trim()) : []
  );
  const [from, setFrom] = useState(current?.from ?? '09:00');
  const [to, setTo]     = useState(current?.to   ?? '17:00');

  const toggleDay = (day: string) =>
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const handleSave = () => {
    const orderedDays = ALL_DAYS.filter(d => selectedDays.includes(d));
    if (orderedDays.length === 0 || !from || !to) {
      onSave(null, null, null);
    } else {
      onSave(orderedDays.join(','), from, to);
    }
  };

  return (
    <div style={{
      position: 'absolute', top: '56px', right: '16px', zIndex: 2000,
      background: tokens.bgMain, border: `1px solid ${tokens.border}`, borderRadius: '12px',
      padding: '16px', minWidth: '280px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '12px', color: tokens.textMain }}>My Availability</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {ALL_DAYS.map(day => (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            style={{
              padding: '4px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 500,
              border: '1px solid',
              borderColor: selectedDays.includes(day) ? tokens.accent : tokens.border,
              background: selectedDays.includes(day) ? tokens.accentSoft : 'transparent',
              color: selectedDays.includes(day) ? tokens.accent : tokens.textMuted,
              cursor: 'pointer',
            }}
          >{day}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.72rem', color: tokens.textMuted, marginBottom: '4px' }}>From</div>
          <input type="time" value={from} onChange={e => setFrom(e.target.value)}
            style={{ width: '100%', background: tokens.bgInput, border: `1px solid ${tokens.border}`, borderRadius: '8px', padding: '6px 8px', color: tokens.textMain, fontSize: '0.85rem' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.72rem', color: tokens.textMuted, marginBottom: '4px' }}>To</div>
          <input type="time" value={to} onChange={e => setTo(e.target.value)}
            style={{ width: '100%', background: tokens.bgInput, border: `1px solid ${tokens.border}`, borderRadius: '8px', padding: '6px 8px', color: tokens.textMain, fontSize: '0.85rem' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={handleSave}
          style={{ flex: 1, background: tokens.accent, color: tokens.textOnAccent, border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
          Save
        </button>
        <button type="button" onClick={() => onSave(null, null, null)}
          style={{ flex: 1, background: 'transparent', color: tokens.textMuted, border: `1px solid ${tokens.border}`, borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
          Clear
        </button>
        <button type="button" onClick={onClose}
          style={{ background: 'transparent', color: tokens.textMuted, border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}>
          ✕
        </button>
      </div>
    </div>
  );
};

export default AvailabilityEditor;
