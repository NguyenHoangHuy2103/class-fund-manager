import { PrismaClient } from "@prisma/client"
import { env } from "../config/env.js"

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

if (env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma
}
