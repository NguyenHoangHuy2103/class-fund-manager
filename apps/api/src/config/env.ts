import { z } from "zod"
import dotenv from "dotenv"

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL là bắt buộc"),
  DIRECT_URL: z.string().optional(),
  TEST_DATABASE_URL: z.string().optional(),
  TEST_DIRECT_URL: z.string().optional(),
  DEV_API_KEY: z.string().default("cf_dev_preview_secret_key_2026"),
  STORAGE_PATH: z.string().default("./storage"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET phải có độ dài ít nhất 32 ký tự"),
  FRONTEND_ORIGIN: z
    .string()
    .default("http://localhost:5173,http://localhost:8443"),
  // Google OAuth credentials (optional in local dev, reported clearly if missing)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z
    .string()
    .default("http://localhost:4000/api/auth/google/callback"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  if (process.env.NODE_ENV === "test") {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      "test_jwt_secret_must_be_at_least_32_characters_long_123456"
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres123@localhost:5432/class_fund_test?schema=public"
  } else {
    console.error("❌ Lỗi cấu hình biến môi trường (Environment Variables):")
    console.error(parsed.error.format())
    process.exit(1)
  }
}

export const env = parsed.success
  ? parsed.data
  : {
      NODE_ENV: "test" as const,
      PORT: 4000,
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres123@localhost:5432/class_fund_test?schema=public",
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
      DEV_API_KEY:
        process.env.DEV_API_KEY || "cf_dev_preview_secret_key_2026",
      STORAGE_PATH: process.env.STORAGE_PATH || "./storage",
      JWT_SECRET:
        process.env.JWT_SECRET ||
        "test_jwt_secret_must_be_at_least_32_characters_long_123456",
      FRONTEND_ORIGIN: "http://localhost:5173,http://localhost:8443",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_CALLBACK_URL: "http://localhost:4000/api/auth/google/callback",
    }

export const allowedOrigins = env.FRONTEND_ORIGIN.split(",").map((o) =>
  o.trim(),
)
