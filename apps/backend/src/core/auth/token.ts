import jwt from "jsonwebtoken";

/**
 * Local HS256 token helpers. This is the single swap-point for auth: replacing
 * local dev auth with Supabase means verifying Supabase's JWT here (RS256 via
 * their JWKS) — nothing else in the app changes, because every route depends
 * only on the `AuthUser` shape produced below.
 */

export type Role = "admin" | "lecturer" | "student";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Copy .env.example to apps/backend/.env");
  }
  return secret;
}

export function signToken(
  user: AuthUser,
  expiresIn: jwt.SignOptions["expiresIn"] = "7d",
): string {
  return jwt.sign({ email: user.email, role: user.role }, getSecret(), {
    subject: user.id,
    expiresIn,
  });
}

export function verifyToken(token: string): AuthUser {
  const payload = jwt.verify(token, getSecret()) as jwt.JwtPayload;
  if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
    throw new Error("Malformed token payload");
  }
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role as Role,
  };
}
