// src/api/chatApi.ts
import { api } from "../api"; // <-- uses your existing axios instance

// ===== DTOs =====

// Matches ChatSummaryDto in ChatsController
export interface ChatDto {
  chatId: string;           // Guid as string
  name: string | null;
  isGroup: boolean;
  unreadCount: number;
  otherUserName?: string | null;  // 👈 NEW
}


// Matches GetMessages / SendMessage responses
export interface ChatMessageDto {
  id: string;
  chatId: string;
  senderId: string;
  senderUserName?: string;  // optional – in case you later add it to the API
  text: string;
  createdAt: string;
  gifUrl?: string;          // optional GIF URL
}

// Matches POST /api/Chats/private response
export interface PrivateChatDto {
  id: string;
  isGroup: boolean;
  name: string | null;
  createdByUserId: string;
  createdAt: string;
}

// Matches UsersController GetUsers projection
export interface ChatUserDto {
  id: string;
  username: string;
  email: string | null;
  role: string;
}

// Matches POST /api/Chats/group response
export interface GroupChatDto {
  id: string;
  name: string;
  isGroup: boolean;
  createdByUserId: string;
  createdAt: string;
  members: ChatUserDto[];
}

// ===== API wrappers =====

export async function getChats(token: string): Promise<ChatDto[]> {
  // token isn’t strictly necessary if you already called setAuthToken,
  // but it doesn’t hurt to log it / ensure it is set.
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  const res = await api.get<ChatDto[]>("/api/Chats");
  console.log("[chatApi] GET /api/Chats status:", res.status, "data:", res.data);
  return res.data;
}

export async function getChatMessages(
  chatId: string,
  token: string,
  skip = 0,
  take = 50
): Promise<ChatMessageDto[]> {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  const res = await api.get<ChatMessageDto[]>(
    `/api/Chats/${encodeURIComponent(chatId)}/messages`,
    {
      params: { skip, take },
    }
  );

  console.log(
    "[chatApi] GET /api/Chats/{chatId}/messages status:",
    res.status,
    "data:",
    res.data
  );
  return res.data;
}

export async function sendChatMessage(
  chatId: string,
  text: string,
  token: string,
  gifUrl?: string
): Promise<ChatMessageDto> {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  const payload: any = {};
  
  // Only include text if it's not empty
  if (text.trim()) {
    payload.text = text.trim();
  }
  
  // Only include gifUrl if provided
  if (gifUrl) {
    payload.gifUrl = gifUrl;
  }

  console.log(
    "[chatApi] POST /api/Chats/{chatId}/messages payload:",
    payload
  );

  try {
    const res = await api.post<ChatMessageDto>(
      `/api/Chats/${encodeURIComponent(chatId)}/messages`,
      payload
    );

    console.log(
      "[chatApi] POST /api/Chats/{chatId}/messages status:",
      res.status,
      "data:",
      res.data
    );
    return res.data;
  } catch (error: any) {
    console.error(
      "[chatApi] POST /api/Chats/{chatId}/messages failed with status:",
      error.response?.status,
      "error details:",
      error.response?.data,
      "error message:",
      error.message
    );
    throw error;
  }
}

export async function markChatRead(
  chatId: string,
  token: string
): Promise<void> {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  const res = await api.post(
    `/api/Chats/${encodeURIComponent(chatId)}/read`,
    null
  );

  console.log(
    "[chatApi] POST /api/Chats/{chatId}/read status:",
    res.status
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Failed to mark chat read: ${res.status}`);
  }
}

// 🔸 This powers your “dropdown with all users”
export async function searchUsers(
  token: string,
  search: string
): Promise<ChatUserDto[]> {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  const trimmed = search.trim();

  const res = await api.get<ChatUserDto[]>("/api/Users", {
    // Your UsersController currently ignores `search`, which is fine:
    // you’ll get ALL users, and we can add real filtering later.
    params: trimmed ? { search: trimmed } : undefined,
  });

  console.log(
    "[chatApi] GET /api/Users status:",
    res.status,
    "data:",
    res.data
  );

  return res.data;
}

export async function createPrivateChat(
  targetUserId: string,
  token: string
): Promise<PrivateChatDto> {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  const payload = { targetUserId };
  console.log(
    "[chatApi] POST /api/Chats/private payload:",
    payload
  );

  const res = await api.post<PrivateChatDto>("/api/Chats/private", payload);

  console.log(
    "[chatApi] POST /api/Chats/private status:",
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
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  const payload = { name: groupName, memberIds };
  console.log("[chatApi] POST /api/Chats/group payload:", payload);

  const res = await api.post<GroupChatDto>("/api/Chats/group", payload);

  console.log(
    "[chatApi] POST /api/Chats/group status:",
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
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  const payload = { userId: memberId };
  console.log("[chatApi] POST /api/Chats/{chatId}/members payload:", payload);

  const res = await api.post(
    `/api/Chats/${encodeURIComponent(chatId)}/members`,
    payload
  );

  console.log(
    "[chatApi] POST /api/Chats/{chatId}/members status:",
    res.status
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Failed to add member: ${res.status}`);
  }
}

export async function removeGroupMember(
  chatId: string,
  memberId: string,
  token: string
): Promise<void> {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  const res = await api.delete(
    `/api/Chats/${encodeURIComponent(chatId)}/members/${encodeURIComponent(memberId)}`
  );

  console.log(
    "[chatApi] DELETE /api/Chats/{chatId}/members/{memberId} status:",
    res.status
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Failed to remove member: ${res.status}`);
  }
}

export async function getGroupMembers(
  chatId: string,
  token: string
): Promise<ChatUserDto[]> {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  const res = await api.get<ChatUserDto[]>(
    `/api/Chats/${encodeURIComponent(chatId)}/members`
  );

  console.log(
    "[chatApi] GET /api/Chats/{chatId}/members status:",
    res.status,
    "data:",
    res.data
  );
  return res.data;
}
