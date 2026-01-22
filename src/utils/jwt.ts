// src/utils/jwt.ts
export function getUserNameFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ??
      null
    );
  } catch {
    return null;
  }
}
