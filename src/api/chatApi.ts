// src/api/chatApi.ts
import { api } from "../api"; // axios instance with baseURL = https://.../api

// ===== DTOs =====

export interface ChatDto {
  chatId: string;
  name: string | null;
  isGroup: boolean;
  unreadCount: number;
  otherUserName?: string | null;
}

export interface ChatAttachmentDto {
  attachmentId: string;
  fileName: string;
  contentType: string;
}

export interface ChatMessageDto {
  id: string;
  chatId: string;
  senderId: string;
  senderUserName?: string;

  // IMPORTANT: can be empty for attachment-only messages
  text?: string;

  createdAt: string;
  gifUrl?: string;

  // NEW: attachment info (if your backend returns it)
  attachment?: ChatAttachmentDto;
}

export interface PrivateChatDto {
  id: string;
  isGroup: boolean;
  name: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface ChatUserDto {
  id: string;
  username: string;
  email: string | null;
  role: string;
}

export interface GroupChatDto {
  id: string;
  name: string;
  isGroup: boolean;
  createdByUserId: string;
  createdAt: string;
  members: ChatUserDto[];
}

// ===== Helpers =====

function applyToken(token: string) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// ===== API wrappers =====

export async function getChats(token: string): Promise<ChatDto[]> {
  applyToken(token);

  const res = await api.get<ChatDto[]>("/Chats");
  console.log("[chatApi] GET /Chats status:", res.status, "data:", res.data);
  return res.data;
}

export async function getChatMessages(
  chatId: string,
  token: string,
  skip = 0,
  take = 50
): Promise<ChatMessageDto[]> {
  applyToken(token);

  const res = await api.get<ChatMessageDto[]>(
    `/Chats/${encodeURIComponent(chatId)}/messages`,
    { params: { skip, take } }
  );

  console.log(
    "[chatApi] GET /Chats/{chatId}/messages status:",
    res.status,
    "data:",
    res.data
  );

  return res.data;
}

type SendChatMessagePayload = {
  text?: string;
  gifUrl?: string;
  attachmentId?: string;
};

export async function sendChatMessage(
  chatId: string,
  text: string,
  token: string,
  gifUrl?: string,
  attachmentId?: string
): Promise<ChatMessageDto> {
  applyToken(token);

  const payload: SendChatMessagePayload = {};

  const trimmed = (text ?? "").trim();
  if (trimmed) payload.text = trimmed;
  if (gifUrl) payload.gifUrl = gifUrl;
  if (attachmentId) payload.attachmentId = attachmentId;

  // allow attachment-only or gif-only messages, but not totally empty
  if (!payload.text && !payload.gifUrl && !payload.attachmentId) {
    throw new Error("Message is empty");
  }

  console.log("[chatApi] POST /Chats/{chatId}/messages payload:", payload);

  const res = await api.post<ChatMessageDto>(
    `/Chats/${encodeURIComponent(chatId)}/messages`,
    payload
  );

  console.log(
    "[chatApi] POST /Chats/{chatId}/messages status:",
    res.status,
    "data:",
    res.data
  );

  return res.data;
}

export async function markChatRead(chatId: string, token: string): Promise<void> {
  applyToken(token);

  const res = await api.post(`/Chats/${encodeURIComponent(chatId)}/read`, null);

  console.log("[chatApi] POST /Chats/{chatId}/read status:", res.status);

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Failed to mark chat read: ${res.status}`);
  }
}

export async function searchUsers(token: string, search: string): Promise<ChatUserDto[]> {
  applyToken(token);

  const trimmed = search.trim();

  const res = await api.get<ChatUserDto[]>("/Users", {
    params: trimmed ? { search: trimmed } : undefined,
  });

  console.log("[chatApi] GET /Users status:", res.status, "data:", res.data);
  return res.data;
}

export async function createPrivateChat(
  targetUserId: string,
  token: string
): Promise<PrivateChatDto> {
  applyToken(token);

  const payload = { targetUserId };
  console.log("[chatApi] POST /Chats/private payload:", payload);

  const res = await api.post<PrivateChatDto>("/Chats/private", payload);

  console.log(
    "[chatApi] POST /Chats/private status:",
    res.status,
    "data:",
    res.data
  );

  return res.data;
}

export async function createGroupChat(
  groupName: string,
  memberIds: string[],
  token: string
): Promise<GroupChatDto> {
  applyToken(token);

  const payload = { name: groupName, memberIds };
  console.log("[chatApi] POST /Chats/group payload:", payload);

  const res = await api.post<GroupChatDto>("/Chats/group", payload);

  console.log(
    "[chatApi] POST /Chats/group status:",
    res.status,
    "data:",
    res.data
  );

  return res.data;
}

export async function addGroupMember(
  chatId: string,
  memberId: string,
  token: string
): Promise<void> {
  applyToken(token);

  const payload = { userId: memberId };
  console.log("[chatApi] POST /Chats/{chatId}/members payload:", payload);

  const res = await api.post(`/Chats/${encodeURIComponent(chatId)}/members`, payload);

  console.log("[chatApi] POST /Chats/{chatId}/members status:", res.status);

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Failed to add member: ${res.status}`);
  }
}

export async function removeGroupMember(
  chatId: string,
  memberId: string,
  token: string
): Promise<void> {
  applyToken(token);

  const res = await api.delete(
    `/Chats/${encodeURIComponent(chatId)}/members/${encodeURIComponent(memberId)}`
  );

  console.log(
    "[chatApi] DELETE /Chats/{chatId}/members/{memberId} status:",
    res.status
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Failed to remove member: ${res.status}`);
  }
}

export async function getGroupMembers(chatId: string, token: string): Promise<ChatUserDto[]> {
  applyToken(token);

  const res = await api.get<ChatUserDto[]>(
    `/Chats/${encodeURIComponent(chatId)}/members`
  );

  console.log(
    "[chatApi] GET /Chats/{chatId}/members status:",
    res.status,
    "data:",
    res.data
  );

  return res.data;
}
