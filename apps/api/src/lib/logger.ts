export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    const cleanMeta = sanitizeMeta(meta)
    console.log(
      `[INFO] ${new Date().toISOString()} - ${message}`,
      cleanMeta ? JSON.stringify(cleanMeta) : "",
    )
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    const cleanMeta = sanitizeMeta(meta)
    console.warn(
      `[WARN] ${new Date().toISOString()} - ${message}`,
      cleanMeta ? JSON.stringify(cleanMeta) : "",
    )
  },
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
    const cleanMeta = sanitizeMeta(meta)
    console.error(
      `[ERROR] ${new Date().toISOString()} - ${message}`,
      error instanceof Error ? error.message : error,
      cleanMeta ? JSON.stringify(cleanMeta) : "",
    )
  },
}

function sanitizeMeta(
  meta?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!meta) return undefined
  const sensitiveKeys = [
    "password",
    "passwordHash",
    "token",
    "jwt",
    "cookie",
    "authorization",
    "secret",
  ]
  const clean: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(meta)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      clean[key] = "[REDACTED]"
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeMeta(value as Record<string, unknown>)
    } else {
      clean[key] = value
    }
  }
  return clean
}
