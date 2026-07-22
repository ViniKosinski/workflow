export type PasswordHasher = Readonly<{
  hash: (password: string) => Promise<string>;
  verify: (passwordHash: string, password: string) => Promise<boolean>;
}>;

export type SessionTokenService = Readonly<{
  create: () => string;
  hash: (token: string) => string;
}>;

export type Clock = Readonly<{
  now: () => Date;
}>;

export type IdGenerator = Readonly<{
  createUserId: () => string;
  createSessionId: () => string;
}>;

export type RateLimiter = Readonly<{
  consume: (input: Readonly<{
    key: string;
    limit: number;
    windowMs: number;
    now: Date;
  }>) => Promise<boolean>;
  deleteExpired: (now: Date) => Promise<void>;
}>;
