import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getUsers, type ChatUserDto } from '../../api/chatApi';
import type { DaySchedule } from '../../types/chat';

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseSchedule(json: string | null | undefined): DaySchedule[] | null {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

function isUserAvailable(user: ChatUserDto, startsAt: Date, endsAt: Date): boolean | null {
  const schedule = parseSchedule(user.availabilitySchedule);
  if (!schedule || schedule.length === 0) return null; // unknown

  const dayKey = DAY_KEYS[startsAt.getDay()];
  const daySlot = schedule.find(s => s.day === dayKey);
  if (!daySlot) return false; // no availability that day

  const [fH, fM] = daySlot.from.split(':').map(Number);
  const [tH, tM] = daySlot.to.split(':').map(Number);
  const slotStart = fH * 60 + fM;
  const slotEnd = tH * 60 + tM;
  const meetStart = startsAt.getHours() * 60 + startsAt.getMinutes();
  const meetEnd = endsAt.getHours() * 60 + endsAt.getMinutes();

  return meetStart >= slotStart && meetEnd <= slotEnd;
}

interface Props {
  token: string;
  onClose: () => void;
  onCreated: () => void;
  onSubmit: (title: string, startsAt: Date, endsAt: Date, inviteeIds: string[]) => Promise<void>;
}

const CreateMeetingModal: React.FC<Props> = ({ token, onClose, onCreated, onSubmit }) => {
  const { tokens } = useTheme();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [users, setUsers] = useState<ChatUserDto[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    getUsers(token).then(setUsers).catch(() => {});
  }, [token]);

  const startsAt = new Date(`${date}T${startTime}`);
  const endsAt = new Date(`${date}T${endTime}`);

  const filteredUsers = users.filter(u =>
    !userSearch.trim() ||
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const toggleUser = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError('Please enter a meeting title.'); return; }
    if (startsAt >= endsAt) { setError('End time must be after start time.'); return; }
    if (selected.size === 0) { setError('Select at least one person to invite.'); return; }

    try {
      setSaving(true);
      await onSubmit(title.trim(), startsAt, endsAt, [...selected]);
      onCreated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to create meeting.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: tokens.bgInput,
    border: `1.5px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 12px',
    color: tokens.textMain,
    fontSize: '0.88rem',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000,
    }}>
      <div style={{
        background: tokens.bgCard, border: `1px solid ${tokens.border}`,
        borderRadius: 14, padding: '28px 26px', width: 460, maxWidth: '95vw',
        boxShadow: '0 12px 48px rgba(0,0,0,0.4)', maxHeight: '90vh', overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ color: tokens.textMain, fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
            📅 Schedule Meeting
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.textMuted, fontSize: '1.2rem' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '8px 12px', fontSize: '0.83rem', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: tokens.textMuted, marginBottom: 5 }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Weekly Sync" style={inputStyle} />
          </div>

          {/* Date */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: tokens.textMuted, marginBottom: 5 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>

          {/* Time */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: tokens.textMuted, marginBottom: 5 }}>Start time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: tokens.textMuted, marginBottom: 5 }}>End time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Invite users */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: tokens.textMuted, marginBottom: 6 }}>
              Invite people ({selected.size} selected)
            </label>
            <input
              placeholder="Filter by name…"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <div style={{
              border: `1px solid ${tokens.border}`, borderRadius: 8,
              maxHeight: 200, overflowY: 'auto', background: tokens.bgMain,
            }}>
              {filteredUsers.length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: '0.8rem', color: tokens.textMuted }}>No users found</div>
              )}
              {filteredUsers.map(u => {
                const avail = isUserAvailable(u, startsAt, endsAt);
                const isChecked = selected.has(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUser(u.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '9px 12px', background: isChecked ? tokens.accentSoft : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      borderBottom: `1px solid ${tokens.border}`,
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${isChecked ? tokens.accent : tokens.border}`,
                      background: isChecked ? tokens.accent : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isChecked && <svg width="9" height="9" viewBox="0 0 9 9"><polyline points="1,4.5 3.5,7 8,1.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: tokens.accent, color: '#fff', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + availability */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.83rem', fontWeight: 500, color: tokens.textMain }}>{u.username}</div>
                      {u.email && <div style={{ fontSize: '0.7rem', color: tokens.textMuted }}>{u.email}</div>}
                    </div>

                    {/* Availability badge */}
                    <div style={{
                      fontSize: '0.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: 12, flexShrink: 0,
                      background: avail === true ? 'rgba(34,197,94,0.15)' : avail === false ? 'rgba(239,68,68,0.12)' : 'transparent',
                      color: avail === true ? '#16a34a' : avail === false ? '#ef4444' : tokens.textMuted,
                      border: avail === null ? 'none' : `1px solid ${avail ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.25)'}`,
                    }}>
                      {avail === true ? '✓ Available' : avail === false ? '✗ Busy' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1, background: saving ? tokens.textMuted : tokens.accent,
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '11px 0', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.88rem',
              }}
            >
              {saving ? 'Scheduling…' : 'Schedule & Send Invites'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, background: 'transparent', color: tokens.textMuted,
                border: `1px solid ${tokens.border}`, borderRadius: 8,
                padding: '11px 0', cursor: 'pointer', fontSize: '0.88rem',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMeetingModal;
