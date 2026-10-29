import { describe, it, expect } from "vitest"
import { parseDbUrl, verifyTestDbSafety } from "./db-guard.js"

describe("Kiểm tra an toàn tách biệt Database Test (Database Safety Guard)", () => {
  it("Bóc tách chính xác endpoint và tên database kể cả khi có -pooler", () => {
    const pooledUrl =
      "postgresql://user:pass@ep-round-math-a1evx5j0-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    const parsed = parseDbUrl(pooledUrl)
    expect(parsed?.endpoint).toBe("ep-round-math-a1evx5j0")
    expect(parsed?.database).toBe("neondb")
  })

  it("Từ chối ngay lập tức khi thiếu TEST_DATABASE_URL", () => {
    const res = verifyTestDbSafety({
      testDbUrl: undefined,
      devDbUrl: "postgresql://user:pass@ep-dev-123.aws.neon.tech/neondb",
    })
    expect(res.safe).toBe(false)
    expect(res.reason).toContain("CHƯA CẤU HÌNH TEST_DATABASE_URL")
  })

  it("Phát hiện trùng lặp giữa pooled test URL và direct dev URL của cùng endpoint/database", () => {
    const devDirect =
      "postgresql://neondb_owner:secret@ep-round-math-a1evx5j0.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    const testPooled =
      "postgresql://neondb_owner:secret@ep-round-math-a1evx5j0-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

    const res = verifyTestDbSafety({
      testDbUrl: testPooled,
      devDbUrl: devDirect,
      directDbUrl: devDirect,
    })
    expect(res.safe).toBe(false)
    expect(res.reason).toContain("XUNG ĐỘT")
  })

  it("Phát hiện trùng lặp khi cùng endpoint nhưng khác database name nếu cùng tên", () => {
    const devUrl =
      "postgresql://neondb_owner:secret@ep-round-math-a1evx5j0-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    const testUrl =
      "postgresql://test_user:pass@ep-round-math-a1evx5j0-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

    const res = verifyTestDbSafety({
      testDbUrl: testUrl,
      devDbUrl: devUrl,
    })
    expect(res.safe).toBe(false)
  })

  it("Cho phép khi TEST_DATABASE_URL trỏ sang endpoint/branch hoàn toàn khác", () => {
    const devUrl =
      "postgresql://neondb_owner:secret@ep-round-math-a1evx5j0-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    const testUrl =
      "postgresql://test_user:pass@ep-test-branch-xyz987.ap-southeast-1.aws.neon.tech/testdb?sslmode=require"

    const res = verifyTestDbSafety({
      testDbUrl: testUrl,
      devDbUrl: devUrl,
    })
    expect(res.safe).toBe(true)
  })
})
