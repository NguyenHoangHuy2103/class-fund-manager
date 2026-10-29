import { z } from "zod"

export const listMembersQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["PENDING", "ACTIVE", "REJECTED", "INACTIVE", "ALL"]).default("ALL"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(50),
})

export const setMemberStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
})
