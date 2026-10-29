import type { Request, Response, NextFunction } from "express"
import { ZodError, type AnyZodObject } from "zod"

export function validate(schema: {
  body?: AnyZodObject
  query?: AnyZodObject
  params?: AnyZodObject
}) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body)
      }
      if (schema.query) {
        req.query = ((await schema.query.parseAsync(req.query)) as any)
      }
      if (schema.params) {
        req.params = ((await schema.params.parseAsync(req.params)) as any)
      }
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0]
        const message = firstError
          ? `${firstError.path.join(".")}: ${firstError.message}`
          : "Dữ liệu không hợp lệ"
        res.status(400).json({
          ok: false,
          error: message,
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        })
        return
      }
      next(error)
    }
  }
}
