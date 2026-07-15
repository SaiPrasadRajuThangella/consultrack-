export interface User {
    token: string;
    refreshToken: string;
    role: "ADMIN" | "USER" | "SUPER_ADMIN" | string;
    userId?: string | number;
    userid?: string | number;
    userName?: string;
    logoUrl?: string;
    countryId?: number | number[];
    [key: string]: unknown;
  }