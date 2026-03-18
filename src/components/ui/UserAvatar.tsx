import React, { useEffect, useState } from 'react';
import { getAvatarUrl } from '../../api';
import { useTheme } from '../../context/ThemeContext';

// Module-level cache: userId → presigned URL (or null = no avatar)
const avatarCache = new Map<string, string | null>();

interface Props {
  userId?: string;
  name: string;
  size?: number;
  /** Show a pencil overlay on hover to signal the avatar is editable */
  editable?: boolean;
  onClick?: () => void;
}

type UserAvatarComponent = React.FC<Props> & { bustCache: (uid: string) => void };

const UserAvatar: UserAvatarComponent = ({ userId, name, size = 36, editable, onClick }) => {
  const { tokens } = useTheme();
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Use cached value if available
    if (avatarCache.has(userId)) {
      setImgUrl(avatarCache.get(userId) ?? null);
      return;
    }

    getAvatarUrl(userId).then((url) => {
      avatarCache.set(userId, url);
      setImgUrl(url);
    });
  }, [userId]);

  const initials = name
    .split(' ')
    .map((p) => p.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const showImage = !!imgUrl && !imgError;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: showImage ? 'transparent' : tokens.accent,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: editable ? 'pointer' : onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {showImage ? (
        <img
          src={imgUrl!}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          style={{
            fontSize: size * 0.38,
            fontWeight: 600,
            color: tokens.textOnAccent,
            lineHeight: 1,
          }}
        >
          {initials}
        </span>
      )}

      {/* Hover overlay shown when editable */}
      {editable && hovered && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size * 0.4}
            height={size * 0.4}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </div>
      )}
    </div>
  );
};

// Static method for cache busting after avatar upload
UserAvatar.bustCache = (uid: string) => {
  avatarCache.delete(uid);
};

export default UserAvatar;
