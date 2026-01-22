// src/data/mockChat.ts

export type ConversationType = "direct" | "group";

export interface Conversation {
  id: string;
  name: string;
  lastMessagePreview: string;
  unreadCount: number;
  type: ConversationType;
  isOnline?: boolean; // for direct chats
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  isMe: boolean;
  text: string;
  createdAt: string; // ISO string
}

export const mockConversations: Conversation[] = [
  {
    id: "c1",
    name: "Outsec Support",
    lastMessagePreview: "Sure, I’ll deploy that to dev.",
    unreadCount: 2,
    type: "group",
  },
  {
    id: "c2",
    name: "Cognito API Team",
    lastMessagePreview: "The new token endpoint is live.",
    unreadCount: 0,
    type: "group",
  },
  {
    id: "c3",
    name: "Gerhard’s Test Bot",
    lastMessagePreview: "Ping from Lambda completed ✅",
    unreadCount: 0,
    type: "direct",
    isOnline: true,
  },
];

export const mockMessages: Message[] = [
  {
    id: "m1",
    conversationId: "c1",
    senderId: "u1",
    senderName: "Gerhard",
    isMe: true,
    text: "Morning team, any blockers on ChatR2.0?",
    createdAt: new Date().toISOString(),
  },
  {
    id: "m2",
    conversationId: "c1",
    senderId: "u2",
    senderName: "Alice",
    isMe: false,
    text: "All good, just wiring Cognito tokens.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "m3",
    conversationId: "c1",
    senderId: "u3",
    senderName: "Bob (AI)",
    isMe: false,
    text: "I’m ready to help with the UI 😉",
    createdAt: new Date().toISOString(),
  },
];
