import { z } from "zod"
import dotenv from "dotenv"

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL là bắt buộc"),
  TEST_DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET phải có độ dài ít nhất 32 ký tự"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_ORIGIN: z
    .string()
    .default("http://localhost:5173,http://localhost:8443"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("❌ Lỗi cấu hình biến môi trường (Environment Variables):")
  console.error(parsed.error.format())
  // In test environment, provide fallback to avoid crashing unit tests before setup
  if (process.env.NODE_ENV === "test") {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      "test_jwt_secret_must_be_at_least_32_characters_long_123456"
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres123@localhost:5432/class_fund_test?schema=public"
  } else {
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
      JWT_SECRET:
        process.env.JWT_SECRET ||
        "test_jwt_secret_must_be_at_least_32_characters_long_123456",
      JWT_EXPIRES_IN: "7d",
      FRONTEND_ORIGIN: "http://localhost:5173,http://localhost:8443",
    }

export const allowedOrigins = env.FRONTEND_ORIGIN.split(",").map((o) =>
  o.trim(),
)
