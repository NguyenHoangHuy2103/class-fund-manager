import { URL } from "url"

export interface DbTargetInfo {
  endpoint: string
  host: string
  port: string
  database: string
}

export function parseDbUrl(urlString?: string): DbTargetInfo | null {
  if (!urlString) return null
  try {
    const parsed = new URL(urlString)
    // Trích xuất endpoint prefix (loại bỏ '-pooler' nếu có để so sánh máy chủ gốc)
    const host = parsed.hostname.toLowerCase()
    const endpoint = host.replace("-pooler", "").split(".")[0] || host
    const database = (parsed.pathname || "").replace(/^\//, "").toLowerCase()
    const port = parsed.port || "5432"

    return { endpoint, host, port, database }
  } catch {
    return null
  }
}

/**
 * Kiểm tra nghiêm ngặt xem TEST_DATABASE_URL có an toàn và hoàn toàn tách biệt khỏi DEV database không.
 * Không chỉ so sánh string thô mà bóc tách hostname, endpoint id và tên database.
 */
export function verifyTestDbSafety(params: {
  testDbUrl?: string
  testDirectUrl?: string
  devDbUrl?: string
  directDbUrl?: string
}): { safe: boolean; reason: string } {
  const { testDbUrl, testDirectUrl, devDbUrl, directDbUrl } = params

  if (!testDbUrl || testDbUrl.trim() === "") {
    return {
      safe: false,
      reason:
        "CHƯA CẤU HÌNH TEST_DATABASE_URL: Biến môi trường TEST_DATABASE_URL chưa được cung cấp. Dừng kiểm thử để bảo vệ database dev.",
    }
  }

  const testTarget = parseDbUrl(testDbUrl)
  if (!testTarget) {
    return {
      safe: false,
      reason: "TEST_DATABASE_URL không đúng định dạng URL kết nối hợp lệ.",
    }
  }

  const devTarget = parseDbUrl(devDbUrl)
  const directTarget = parseDbUrl(directDbUrl)

  // 1. So khớp với dev database: Cùng host/endpoint là cùng compute/branch Neon
  if (devTarget) {
    if (testTarget.endpoint === devTarget.endpoint) {
      return {
        safe: false,
        reason: `XUNG ĐỘT ENDPOINT/BRANCH: TEST_DATABASE_URL trỏ cùng Neon endpoint [${testTarget.endpoint}] với DEV DATABASE_URL. Cần branch/database độc lập hoàn toàn để không ảnh hưởng môi trường dev.`,
      }
    }
  }

  // 2. So khớp với direct database
  if (directTarget) {
    if (testTarget.endpoint === directTarget.endpoint) {
      return {
        safe: false,
        reason: `XUNG ĐỘT ENDPOINT/BRANCH: TEST_DATABASE_URL trỏ cùng Neon endpoint [${testTarget.endpoint}] với DIRECT_URL. Cần branch/database độc lập hoàn toàn để không ảnh hưởng môi trường dev.`,
      }
    }
  }

  // 3. Nếu có TEST_DIRECT_URL, kiểm tra nó cũng phải độc lập
  if (testDirectUrl) {
    const testDirectTarget = parseDbUrl(testDirectUrl)
    if (testDirectTarget && devTarget && testDirectTarget.endpoint === devTarget.endpoint) {
      return {
        safe: false,
        reason: `XUNG ĐỘT ENDPOINT/BRANCH: TEST_DIRECT_URL trỏ cùng Neon endpoint [${testDirectTarget.endpoint}] với DEV DATABASE_URL.`,
      }
    }
    if (testDirectTarget && directTarget && testDirectTarget.endpoint === directTarget.endpoint) {
      return {
        safe: false,
        reason: `XUNG ĐỘT ENDPOINT/BRANCH: TEST_DIRECT_URL trỏ cùng Neon endpoint [${testDirectTarget.endpoint}] với DIRECT_URL.`,
      }
    }
  }

  return {
    safe: true,
    reason: `An toàn: Database test hoàn toàn tách biệt khỏi môi trường dev (Test endpoint: ${testTarget.endpoint}, database: ${testTarget.database}).`,
  }
}
