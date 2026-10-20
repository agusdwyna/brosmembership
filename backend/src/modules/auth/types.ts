export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  /** Resolved from the user's role; present on login/me so the UI can gate on capabilities. */
  permissions?: string[];
}
