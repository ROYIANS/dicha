import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      name: string;
      avatar: string | null;
      email: string | null;
      phone: string | null;
    };
    pkceVerifier?: string;
    nonce?: string;
    state?: string;
  }
}
