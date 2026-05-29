import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { respondToMeeting, deleteMeeting, type MeetingDto } from '../../api/chatApi';

interface Props {
  meetings: MeetingDto[];
  token: string;
  currentUserId: string;
  onRefresh: () => void;
  onSchedule: () => void;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' · ' + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function isPast(iso: string) {
  return new Date(iso) < new Date();
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colours: Record<string, { bg: string; text: string }> = {
    organiser: { bg: 'rgba(124,58,237,0.15)', text: '#7c3aed' },
    accepted:  { bg: 'rgba(34,197,94,0.15)',  text: '#16a34a' },
    declined:  { bg: 'rgba(239,68,68,0.12)',  text: '#ef4444' },
    pending:   { bg: 'rgba(234,179,8,0.15)',  text: '#ca8a04' },
  };
  const c = colours[status] ?? colours.pending;
  return (
    <span style={{
      fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10,
      background: c.bg, color: c.text, textTransform: 'uppercase', letterSpacing: 0.4,
    }}>
      {status}
    </span>
  );
};

const MeetingCard: React.FC<{
  meeting: MeetingDto;
  token: string;
  onRefresh: () => void;
}> = ({ meeting, token, onRefresh }) => {
  const { tokens } = useTheme();
  const [responding, setResponding] = useState(false);
  const past = isPast(meeting.endsAt);

  const respond = async (r: 'accepted' | 'declined') => {
    setResponding(true);
    try {
      await respondToMeeting(token, meeting.id, r);
      onRefresh();
    } finally {
      setResponding(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${meeting.title}"?`)) return;
    await deleteMeeting(token, meeting.id);
    onRefresh();
  };

  return (
    <div style={{
      padding: '10px 12px',
      borderBottom: `1px solid ${tokens.border}`,
      opacity: past ? 0.55 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: tokens.textMain, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meeting.title}
          </div>
          <div style={{ fontSize: '0.7rem', color: tokens.textMuted }}>
            {formatDateTime(meeting.startsAt)} – {formatTime(meeting.endsAt)}
          </div>
          {!meeting.isOrganiser && (
            <div style={{ fontSize: '0.68rem', color: tokens.textMuted, marginTop: 1 }}>
              by {meeting.createdByUsername}
            </div>
          )}
          {meeting.isOrganiser && meeting.invites.length > 0 && (
            <div style={{ fontSize: '0.68rem', color: tokens.textMuted, marginTop: 1 }}>
              {meeting.invites.length} invite{meeting.invites.length > 1 ? 's' : ''} sent
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge status={meeting.myStatus} />
          {meeting.isOrganiser && !past && (
            <button
              onClick={remove}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.72rem', padding: 0 }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Accept / Decline for pending invites */}
      {!meeting.isOrganiser && meeting.myStatus === 'pending' && !past && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button
            disabled={responding}
            onClick={() => respond('accepted')}
            style={{
              flex: 1, padding: '5px 0', borderRadius: 6, border: 'none',
              background: 'rgba(34,197,94,0.18)', color: '#16a34a',
              fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            ✓ Accept
          </button>
          <button
            disabled={responding}
            onClick={() => respond('declined')}
            style={{
              flex: 1, padding: '5px 0', borderRadius: 6, border: 'none',
              background: 'rgba(239,68,68,0.12)', color: '#ef4444',
              fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            ✗ Decline
          </button>
        </div>
      )}
    </div>
  );
};

const MeetingInvitesPanel: React.FC<Props> = ({ meetings, token, onRefresh, onSchedule }) => {
  const { tokens } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const upcoming = meetings.filter(m => !isPast(m.endsAt));
  const past = meetings.filter(m => isPast(m.endsAt));
  const pendingCount = upcoming.filter(m => m.myStatus === 'pending').length;
  const shown = tab === 'upcoming' ? upcoming : past;

  return (
    <div style={{
      borderTop: `1px solid ${tokens.border}`,
      background: tokens.bgSidebar ?? tokens.bgMain,
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: tokens.textMain }}>📅 Meetings</span>
          {pendingCount > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', borderRadius: 10,
              fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', lineHeight: 1.4,
            }}>
              {pendingCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={e => { e.stopPropagation(); onSchedule(); }}
            style={{
              background: tokens.accent, color: '#fff', border: 'none',
              borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            + New
          </button>
          <span style={{ color: tokens.textMuted, fontSize: '0.7rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${tokens.border}` }}>
            {(['upcoming', 'past'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '5px 0', fontSize: '0.72rem', fontWeight: 600,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: tab === t ? tokens.accent : tokens.textMuted,
                  borderBottom: tab === t ? `2px solid ${tokens.accent}` : '2px solid transparent',
                  textTransform: 'capitalize',
                }}
              >
                {t} ({t === 'upcoming' ? upcoming.length : past.length})
              </button>
            ))}
          </div>

          {/* Meeting list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {shown.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '0.75rem', color: tokens.textMuted, textAlign: 'center' }}>
                {tab === 'upcoming' ? 'No upcoming meetings' : 'No past meetings'}
              </div>
            ) : (
              shown.map(m => (
                <MeetingCard key={m.id} meeting={m} token={token} onRefresh={onRefresh} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingInvitesPanel;
