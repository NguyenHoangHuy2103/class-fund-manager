import { prisma } from "../src/lib/prisma.js"

async function main() {
  const targetEmail = process.argv[2]
  if (!targetEmail) {
    console.error("Vui lòng cung cấp địa chỉ email cần xem: npm --prefix apps/api run dev:email <email>")
    process.exit(1)
  }

  const email = await prisma.emailOutbox.findFirst({
    where: { toEmail: targetEmail },
    orderBy: { createdAt: "desc" },
  })

  if (!email) {
    console.log(`❌ Chưa tìm thấy email nào gửi đến: ${targetEmail}`)
    process.exit(1)
  }

  console.log("=== EMAIL PREVIEW (LOCAL DEV CLI) ===")
  console.log(`To: ${email.toEmail}`)
  console.log(`Subject: ${email.subject}`)
  console.log(`Created At: ${email.createdAt.toISOString()}`)
  
  const tokenMatch = email.htmlContent.match(/<b>([a-f0-9]{64})<\/b>/)
  if (tokenMatch) {
    console.log(`\n🔑 TOKEN XÁC THỰC / RESET: ${tokenMatch[1]}`)
  } else {
    console.log(`\nNội dung HTML:\n${email.htmlContent}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
