import React, { useState } from 'react';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  current: { days: string; from: string; to: string } | null;
  onSave: (days: string | null, from: string | null, to: string | null) => void;
  onClose: () => void;
}

const AvailabilityEditor: React.FC<Props> = ({ current, onSave, onClose }) => {
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
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px',
      padding: '16px', minWidth: '280px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '12px', color: '#e5e7eb' }}>My Availability</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {ALL_DAYS.map(day => (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            style={{
              padding: '4px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 500,
              border: '1px solid',
              borderColor: selectedDays.includes(day) ? '#38bdf8' : '#1e293b',
              background: selectedDays.includes(day) ? 'rgba(56,189,248,0.15)' : 'transparent',
              color: selectedDays.includes(day) ? '#38bdf8' : '#9ca3af',
              cursor: 'pointer',
            }}
          >{day}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: '4px' }}>From</div>
          <input type="time" value={from} onChange={e => setFrom(e.target.value)}
            style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '6px 8px', color: '#e5e7eb', fontSize: '0.85rem' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: '4px' }}>To</div>
          <input type="time" value={to} onChange={e => setTo(e.target.value)}
            style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '6px 8px', color: '#e5e7eb', fontSize: '0.85rem' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={handleSave}
          style={{ flex: 1, background: '#38bdf8', color: '#020617', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
          Save
        </button>
        <button type="button" onClick={() => onSave(null, null, null)}
          style={{ flex: 1, background: 'transparent', color: '#9ca3af', border: '1px solid #1e293b', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
          Clear
        </button>
        <button type="button" onClick={onClose}
          style={{ background: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}>
          ✕
        </button>
      </div>
    </div>
  );
};

export default AvailabilityEditor;
