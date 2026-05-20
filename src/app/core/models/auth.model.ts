export interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface AuthSession {
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
}
