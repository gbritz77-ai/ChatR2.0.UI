// src/types/chat.ts

export type ConversationType = "direct" | "group";

export interface Conversation {
  id: string;
  name: string;
  lastMessagePreview: string;
  unreadCount: number;
  type: ConversationType;   // "direct" or "group"
  isOnline?: boolean;       // optional for 1:1
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