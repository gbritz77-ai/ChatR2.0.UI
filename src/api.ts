import axios from "axios";

const apiBase = import.meta.env.VITE_API_BASE as string;

export const api = axios.create({
  baseURL: apiBase,
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  username: string;
  role: string;
}

export async function login(usernameOrEmail: string, password: string) {
  const res = await api.post<LoginResponse>("/api/Auth/login", {
    usernameOrEmail,
    password,
  });
  return res.data;
}
