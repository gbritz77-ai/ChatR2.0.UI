import axios from "axios";

const apiBase = import.meta.env.VITE_API_BASE as string;

// Safety check
if (!apiBase || !apiBase.startsWith("https://")) {
  throw new Error("VITE_API_BASE must be absolute (https://...)");
}

// Normalize (remove trailing slash)
const normalizedBase = apiBase.replace(/\/+$/, "");

export const api = axios.create({
  baseURL: `${normalizedBase}/api`,
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export interface LoginResponse {
  userId: string;
  token: string;
  expiresAt: string;
  username: string;
  role: string;
  mustChangePassword: boolean;
}

export async function login(usernameOrEmail: string, password: string) {
  const res = await api.post<LoginResponse>("/Auth/login", {
    usernameOrEmail,
    password,
  });
  return res.data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await api.post("/Auth/change-password", { currentPassword, newPassword });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>("/Auth/forgot-password", { email });
  return res.data;
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>("/Auth/reset-password", { token, newPassword });
  return res.data;
}

export async function inviteUser(username: string, email: string, group?: string): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>("/Users/invite", { username, email, group: group || null });
  return res.data;
}

// -----------------------------
// User Management (Master only)
// -----------------------------

export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  role: string;
  group: string | null;
}

export async function listAllUsers(): Promise<ManagedUser[]> {
  const res = await api.get<ManagedUser[]>("/Users");
  return res.data;
}

export async function updateUser(id: string, data: { username: string; email: string; role: string; group?: string }): Promise<void> {
  await api.put(`/Users/${id}`, data);
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/Users/${id}`);
}

export async function setUserPassword(id: string, newPassword: string): Promise<void> {
  await api.post(`/Users/${id}/set-password`, { newPassword });
}

// -----------------------------
// Attachments (S3 pre-signed)
// -----------------------------

export interface PresignUploadRequest {
  chatId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface PresignUploadResponse {
  attachmentId: string;
  key: string;
  uploadUrl: string;
  expiresAt: string;
  fileName: string;
  contentType: string;
}

export async function presignUpload(payload: PresignUploadRequest) {
  const res = await api.post<PresignUploadResponse>("/attachments/presign-upload", payload);
  return res.data;
}

export interface PresignDownloadRequest {
  chatId: string;
  attachmentId: string;
}

export interface PresignDownloadResponse {
  downloadUrl: string;
  expiresAt: string;
}

export async function presignDownload(payload: PresignDownloadRequest) {
  const res = await api.post<PresignDownloadResponse>("/attachments/presign-download", payload);
  return res.data;
}

// -----------------------------
// Avatar (S3 pre-signed)
// -----------------------------

export async function getAvatarUploadUrl(contentType: string): Promise<{ uploadUrl: string; key: string }> {
  const res = await api.get<{ uploadUrl: string; key: string }>("/Users/me/avatar-upload-url", {
    params: { contentType },
  });
  return res.data;
}

export async function confirmAvatar(key: string): Promise<void> {
  await api.post("/Users/me/avatar", { key });
}

// Returns the presigned GET URL, or null if the user has no avatar (404)
export async function getAvatarUrl(userId: string): Promise<string | null> {
  try {
    const res = await api.get<{ url: string }>(`/Users/${userId}/avatar-url`);
    return res.data.url;
  } catch {
    return null;
  }
}
