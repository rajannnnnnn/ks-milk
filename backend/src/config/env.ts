import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  BUSINESS_LAT: z.coerce.number().default(12.9716),
  BUSINESS_LNG: z.coerce.number().default(77.5946),
  BUSINESS_TIMEZONE: z.string().default("Asia/Kolkata"),
  PAYMENT_PROVIDER: z.string().default("dev"),
  PAYMENT_KEY_ID: z.string().optional().default(""),
  PAYMENT_KEY_SECRET: z.string().optional().default(""),
  PAYMENT_WEBHOOK_SECRET: z.string().optional().default(""),
  SMS_PROVIDER: z.string().default("dev"),
  EMAIL_PROVIDER: z.string().default("dev"),
  PUSH_PROVIDER: z.string().default("dev"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
});

export const env = envSchema.parse(process.env);
