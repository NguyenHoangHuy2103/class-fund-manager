import { PrismaClient, GlobalRole, ClassRole, MemberStatus, PeriodStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("CẢNH BÁO: Không được chạy seed trên môi trường production!")
  }

  console.log("--- Bắt đầu khởi tạo dữ liệu mẫu (Seed GĐ1) cho môi trường local ---")

  const demoSalt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash("Matkhau@123", demoSalt)

  // 1. Tạo tài khoản SUPER_ADMIN duy nhất
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@classfund.local" },
    update: {},
    create: {
      email: "superadmin@classfund.local",
      fullName: "Hệ Thống Quản Trị Viên",
      passwordHash,
      globalRole: GlobalRole.SUPER_ADMIN,
      isEmailVerified: true,
    },
  })
  console.log("-> Tạo Super Admin:", superAdmin.email)

  // 2. Tạo tài khoản Thủ quỹ mẫu
  const treasurerUser = await prisma.user.upsert({
    where: { email: "thuquy@lopse1902.edu.vn" },
    update: {},
    create: {
      email: "thuquy@lopse1902.edu.vn",
      fullName: "Trần Bảo Ngọc (Thủ quỹ)",
      passwordHash,
      globalRole: GlobalRole.USER,
      isEmailVerified: true,
      phone: "0912345678",
    },
  })

  // 3. Tạo Lớp mẫu do Thủ quỹ tạo (1 user chỉ tạo 1 lớp)
  const sampleClass = await prisma.class.upsert({
    where: { code: "CNTT-K15" },
    update: {},
    create: {
      code: "CNTT-K15",
      name: "Lớp Công Nghệ Thông Tin K15",
      inviteCode: "K15DEMO",
      isInviteActive: true,
      createdById: treasurerUser.id,
      bankBin: "970422",
      bankName: "MBBank",
      bankAccountNo: "0912345678",
      bankAccountHolder: "TRAN BAO NGOC",
    },
  })

  // 4. Tạo Membership Thủ quỹ
  await prisma.classMember.upsert({
    where: { classId_userId: { classId: sampleClass.id, userId: treasurerUser.id } },
    update: { role: ClassRole.TREASURER, status: MemberStatus.ACTIVE },
    create: {
      classId: sampleClass.id,
      userId: treasurerUser.id,
      memberCode: "SE190202",
      displayName: "Trần Bảo Ngọc",
      role: ClassRole.TREASURER,
      status: MemberStatus.ACTIVE,
    },
  })

  // 5. Tạo Kỳ hoạt động OPEN đầu tiên của lớp
  const activePeriod = await prisma.period.findFirst({
    where: { classId: sampleClass.id, status: PeriodStatus.OPEN },
  })
  if (!activePeriod) {
    await prisma.period.create({
      data: {
        classId: sampleClass.id,
        name: "Học kỳ 1 (2026 - 2027)",
        startDate: new Date("2026-09-01T00:00:00.000Z"),
        status: PeriodStatus.OPEN,
        openingCash: BigInt(0),
        openingBank: BigInt(0),
      },
    })
    console.log("-> Tạo Kỳ 1 OPEN cho lớp CNTT-K15")
  }

  // 6. Tạo các thành viên thường (ACTIVE và PENDING)
  const memberUsers = [
    {
      email: "anh.lh@lopse1902.edu.vn",
      fullName: "Lê Hoàng Anh",
      code: "SE190203",
      status: MemberStatus.ACTIVE,
    },
    {
      email: "ha.pt@lopse1902.edu.vn",
      fullName: "Phạm Thu Hà",
      code: "SE190204",
      status: MemberStatus.ACTIVE,
    },
    {
      email: "pending@lopse1902.edu.vn",
      fullName: "Đỗ Khánh Vy (Chờ duyệt)",
      code: "SE190210",
      status: MemberStatus.PENDING,
    },
  ]

  for (const m of memberUsers) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        fullName: m.fullName,
        passwordHash,
        globalRole: GlobalRole.USER,
        isEmailVerified: true,
      },
    })

    await prisma.classMember.upsert({
      where: { classId_userId: { classId: sampleClass.id, userId: user.id } },
      update: { status: m.status },
      create: {
        classId: sampleClass.id,
        userId: user.id,
        memberCode: m.code,
        displayName: m.fullName,
        role: ClassRole.MEMBER,
        status: m.status,
      },
    })
  }

  console.log("--- Hoàn tất seed dữ liệu GĐ1 thành công! ---")
  console.log("Tài khoản demo (Mật khẩu: Matkhau@123):")
  console.log("1. Super Admin: superadmin@classfund.local")
  console.log("2. Thủ quỹ:     thuquy@lopse1902.edu.vn (Mã lớp: CNTT-K15, Mã mời: K15DEMO)")
  console.log("3. Member 1:    anh.lh@lopse1902.edu.vn (Đã duyệt ACTIVE)")
  console.log("4. Member chờ:  pending@lopse1902.edu.vn (Đang chờ duyệt PENDING)")
}

main()
  .catch((e) => {
    console.error("Lỗi khi chạy seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
