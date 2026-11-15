export interface Env {
  DB: D1Database;
  PRESENCE_KV: KVNamespace;
  STORAGE_BUCKET?: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  CORS_ORIGIN?: string;
  BASE_URL?: string;
  NTFY_SERVER?: string;
  NTFY_TOPIC?: string;
}

export interface AuthUser {
  uid: string;
  email?: string;
  role?: 'admin' | 'owner' | 'moderator' | 'mod' | 'user';
}

export interface CustomVariables {
  user: AuthUser;
}

