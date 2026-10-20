export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
