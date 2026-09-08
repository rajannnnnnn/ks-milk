import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { errors } from "../lib/errors";
import { Role } from "@prisma/client";

const MOBILE_REGEX = /^[6-9]\d{9}$/; // India-style 10 digit mobile, adjust per market

export function validateMobile(mobile: string): boolean {
  return MOBILE_REGEX.test(mobile);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

interface TokenPayload {
  userId: string;
  role: Role;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as TokenPayload;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString("hex");
  const ttlMs = parseTtlToMs(env.JWT_REFRESH_TTL);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return raw;
}

export async function rotateRefreshToken(rawToken: string): Promise<{ userId: string; role: Role; newToken: string }> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw errors.unauthorized("Invalid or expired session. Please login again.");
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const newToken = await issueRefreshToken(record.userId);
  return { userId: record.userId, role: record.user.role, newToken };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function parseTtlToMs(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2] as "s" | "m" | "h" | "d";
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
  return value * multipliers[unit];
}
