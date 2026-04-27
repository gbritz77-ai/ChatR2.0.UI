// src/types/chat.ts

export type ConversationType = "direct" | "group";

export interface DaySchedule {
  day: string;   // "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
  from: string;  // "09:00"
  to: string;    // "17:00"
}

export interface Conversation {
  id: string;
  name: string;
  lastMessagePreview: string;
  unreadCount: number;
  type: ConversationType;   // "direct" or "group"
  isOnline?: boolean;       // optional for 1:1
  otherUserId?: string;     // used for presence matching
  otherUserLastSeenAt?: string | null; // used for periodic presence recalculation
  createdByUserId?: string; // used to highlight group creator
  otherUserHasAvatar?: boolean;
  otherUserGroup?: string | null;
  chatAvatarUrl?: string | null;
  availabilitySchedule?: DaySchedule[] | null;
  otherMemberLastReadAt?: string | null;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  contentType: string;
}

export interface ReplyPreview {
  id: string;
  senderName: string;
  text: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  isMe: boolean;
  text: string;
  createdAt: string;        // ISO string
  gifUrl?: string;          // optional GIF URL
  attachments?: MessageAttachment[];
  isEdited?: boolean;
  editedAt?: string;
  replyTo?: ReplyPreview;
  reactions?: MessageReaction[];
}
export type ChatAttachment = {
  attachmentId: string;
  fileName: string;
  contentType: string;
  size?: number;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  createdAt: string;

  // NEW:
  attachment?: ChatAttachment;
};