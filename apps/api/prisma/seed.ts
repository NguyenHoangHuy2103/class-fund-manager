import {
  PrismaClient,
  Role,
  MemberStatus,
  CollectionStatus,
  TransactionType,
} from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CẢNH BÁO: Không được chạy seed trên môi trường production!",
    )
  }

  console.log(
    "--- Bắt đầu khởi tạo dữ liệu mẫu (Seed) cho môi trường local ---",
  )

  // Mật khẩu demo chung cho môi trường local: "Matkhau@123"
  const demoSalt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash("Matkhau@123", demoSalt)

  // 1. Tạo tài khoản Admin (Quản trị lớp / Lớp trưởng)
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@lopse1902.edu.vn" },
    update: {},
    create: {
      email: "admin@lopse1902.edu.vn",
      passwordHash,
      role: Role.ADMIN,
    },
  })

  // Thành viên đại diện cho Admin
  await prisma.member.upsert({
    where: { code: "SE190201" },
    update: { userId: adminUser.id },
    create: {
      code: "SE190201",
      name: "Nguyễn Minh Khôi (Lớp trưởng)",
      email: "admin@lopse1902.edu.vn",
      phone: "0901234567",
      status: MemberStatus.ACTIVE,
      userId: adminUser.id,
    },
  })

  // 2. Tạo tài khoản Thủ quỹ (vai trò ADMIN trong hệ thống MVP để quản lý thu chi)
  const treasurerUser = await prisma.user.upsert({
    where: { email: "thuquy@lopse1902.edu.vn" },
    update: {},
    create: {
      email: "thuquy@lopse1902.edu.vn",
      passwordHash,
      role: Role.ADMIN,
    },
  })

  await prisma.member.upsert({
    where: { code: "SE190202" },
    update: { userId: treasurerUser.id },
    create: {
      code: "SE190202",
      name: "Trần Bảo Ngọc (Thủ quỹ)",
      email: "thuquy@lopse1902.edu.vn",
      phone: "0912345678",
      status: MemberStatus.ACTIVE,
      userId: treasurerUser.id,
    },
  })

  // 3. Tạo các thành viên thường (MEMBER)
  const sampleMembers = [
    {
      code: "SE190203",
      name: "Lê Hoàng Anh",
      email: "anh.lh@lopse1902.edu.vn",
      phone: "0923456781",
    },
    {
      code: "SE190204",
      name: "Phạm Thu Hà",
      email: "ha.pt@lopse1902.edu.vn",
      phone: "0923456782",
    },
    {
      code: "SE190205",
      name: "Võ Quốc Bảo",
      email: "bao.vq@lopse1902.edu.vn",
      phone: "0923456783",
    },
    {
      code: "SE190206",
      name: "Đặng Gia Linh",
      email: "linh.dg@lopse1902.edu.vn",
      phone: "0923456784",
    },
    {
      code: "SE190207",
      name: "Bùi Anh Tuấn",
      email: "tuan.ba@lopse1902.edu.vn",
      phone: "0923456785",
    },
    {
      code: "SE190208",
      name: "Hoàng Mai Chi",
      email: "chi.hm@lopse1902.edu.vn",
      phone: "0923456786",
    },
    {
      code: "SE190209",
      name: "Ngô Đức Thịnh",
      email: "thinh.nd@lopse1902.edu.vn",
      phone: "0923456787",
    },
    {
      code: "SE190210",
      name: "Đỗ Khánh Vy",
      email: "vy.dk@lopse1902.edu.vn",
      phone: "0923456788",
    },
  ]

  const createdMembers = []
  for (const m of sampleMembers) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        passwordHash,
        role: Role.MEMBER,
      },
    })

    const member = await prisma.member.upsert({
      where: { code: m.code },
      update: { userId: user.id },
      create: {
        code: m.code,
        name: m.name,
        email: m.email,
        phone: m.phone,
        status: MemberStatus.ACTIVE,
        userId: user.id,
      },
    })
    createdMembers.push(member)
  }

  // 4. Tạo khoản đóng quỹ mẫu (Collections)
  const col1 = await prisma.collection.upsert({
    where: { id: "col-hk1-2026" },
    update: {},
    create: {
      id: "col-hk1-2026",
      name: "Quỹ lớp đầu kỳ – HK1 2026",
      description:
        "Chi phí sinh hoạt lớp, in ấn tài liệu và hoạt động chung trong học kỳ.",
      amount: 300000, // 300,000 VND
      dueDate: new Date("2026-09-15T23:59:59.000Z"),
      status: CollectionStatus.OPEN,
      createdById: treasurerUser.id,
    },
  })

  await prisma.collection.upsert({
    where: { id: "col-tri-an-2011" },
    update: {},
    create: {
      id: "col-tri-an-2011",
      name: "Quà tặng thầy cô 20/11",
      description: "Hoa và quà tri ân thầy cô nhân ngày Nhà giáo Việt Nam.",
      amount: 80000, // 80,000 VND
      dueDate: new Date("2026-11-15T23:59:59.000Z"),
      status: CollectionStatus.OPEN,
      createdById: treasurerUser.id,
    },
  })

  // 5. Tạo xác nhận đóng tiền (Payment + Transaction) cho một số thành viên
  // Lê Hoàng Anh và Phạm Thu Hà đã đóng đợt 1
  const paidMembersCol1 = [createdMembers[0], createdMembers[1]]

  let txSeq = 1
  for (const m of paidMembersCol1) {
    const existingPayment = await prisma.payment.findUnique({
      where: {
        collectionId_memberId: {
          collectionId: col1.id,
          memberId: m.id,
        },
      },
    })

    if (!existingPayment) {
      const code = `GD-${String(txSeq).padStart(4, "0")}`
      txSeq++

      await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            code,
            type: TransactionType.INCOME,
            category: "Đóng quỹ",
            amount: col1.amount,
            date: new Date("2026-09-05T10:00:00.000Z"),
            description: `${col1.name} – ${m.name}`,
            counterparty: m.name,
            note: "Chuyển khoản đã xác nhận",
            createdById: treasurerUser.id,
          },
        })

        await tx.payment.create({
          data: {
            collectionId: col1.id,
            memberId: m.id,
            amount: col1.amount,
            paidAt: new Date("2026-09-05T10:00:00.000Z"),
            note: "Đã nhận đủ tiền",
            confirmedById: treasurerUser.id,
            transactionId: transaction.id,
          },
        })
      })
    }
  }

  // 6. Tạo một khoản thu khác và khoản chi mẫu
  const sampleIncomeCode = `GD-${String(txSeq).padStart(4, "0")}`
  txSeq++
  const existingIncome = await prisma.transaction.findUnique({
    where: { code: sampleIncomeCode },
  })
  if (!existingIncome) {
    await prisma.transaction.create({
      data: {
        code: sampleIncomeCode,
        type: TransactionType.INCOME,
        category: "Tài trợ",
        amount: 500000, // 500,000 VND
        date: new Date("2026-09-10T14:30:00.000Z"),
        description: "Tài trợ từ CLB cựu sinh viên",
        counterparty: "CLB Cựu Sinh Viên",
        note: "Hỗ trợ sinh hoạt lớp kỳ 1",
        createdById: treasurerUser.id,
      },
    })
  }

  const sampleExpenseCode = `GD-${String(txSeq).padStart(4, "0")}`
  txSeq++
  const existingExpense = await prisma.transaction.findUnique({
    where: { code: sampleExpenseCode },
  })
  if (!existingExpense) {
    await prisma.transaction.create({
      data: {
        code: sampleExpenseCode,
        type: TransactionType.EXPENSE,
        category: "Văn phòng phẩm",
        amount: 150000, // 150,000 VND
        date: new Date("2026-09-12T09:15:00.000Z"),
        description: "In ấn tài liệu sinh hoạt lớp đầu kỳ",
        counterparty: "Tiệm in Minh Tâm",
        note: "In 20 bộ tài liệu",
        createdById: treasurerUser.id,
      },
    })
  }

  console.log("--- Hoàn tất seed dữ liệu thành công! ---")
  console.log("Tài khoản demo (Mật khẩu: Matkhau@123):")
  console.log("1. Admin:    admin@lopse1902.edu.vn")
  console.log("2. Thủ quỹ:  thuquy@lopse1902.edu.vn")
  console.log("3. Member:   anh.lh@lopse1902.edu.vn")
  console.log("4. Member:   ha.pt@lopse1902.edu.vn")
}

main()
  .catch((e) => {
    console.error("Lỗi khi chạy seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
