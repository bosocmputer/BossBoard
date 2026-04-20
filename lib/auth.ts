import { SignJWT, jwtVerify } from "jose";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me-in-production-32chars"
);

export interface JWTPayload {
  sub: string;
  username: string;
  role: string;
}

export const COOKIE_NAME = "bb_token";
export const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
