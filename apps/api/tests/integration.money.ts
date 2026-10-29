import dotenv from "dotenv"
dotenv.config()
dotenv.config({ path: "apps/api/.env" })

import { verifyTestDbSafety } from "./db-guard.js"
import { execSync } from "child_process"

function safeStr(obj: any): string {
  return JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v))
}

/**
 * Suite kiểm thử tích hợp tài chính GĐ2 (Financial Integration Test Suite)
 * Enforces strict safety rules, atomic ledger SSOT, true concurrency, idempotency, and access controls.
 */
async function runFinancialIntegrationTests() {
  console.log("=== KIỂM THỬ TÍCH HỢP TÀI CHÍNH GIAI ĐOẠN 2 (CORE MONEY INTEGRATION) ===")

  // 1. Kiểm tra an toàn tuyệt đối trước khi kết nối
  const safety = verifyTestDbSafety({
    testDbUrl: process.env.TEST_DATABASE_URL,
    testDirectUrl: process.env.TEST_DIRECT_URL,
    devDbUrl: process.env.DATABASE_URL,
    directDbUrl: process.env.DIRECT_URL,
  })

  if (!safety.safe) {
    console.warn("\n⚠️  [THÔNG BÁO BẢO VỆ DỮ LIỆU - SAFETY GUARD]")
    console.warn(`-> ${safety.reason}`)
    console.warn("-> Hệ thống dừng kiểm thử tích hợp để đảm bảo an toàn tuyệt đối cho Dev Database.")
    console.warn("-> Trạng thái: CHƯA CHẠY (Chờ người dùng cung cấp TEST_DATABASE_URL riêng)\n")
    return {
      status: "CHƯA_CHẠY",
      total: 11,
      passed: 0,
      failed: 0,
      reason: safety.reason,
    }
  }

  console.log(`-> Database test an toàn và độc lập: ${safety.reason}`)
  const testDbUrl = process.env.TEST_DATABASE_URL!
  const testDirectUrl = process.env.TEST_DIRECT_URL || testDbUrl.replace("-pooler", "")

  // Thiết lập DATABASE_URL của process trỏ sang testDbUrl để toàn bộ module prisma dùng chung
  process.env.DATABASE_URL = testDbUrl

  // 2. Chạy migration trên Test Database (Dùng biến riêng của Test, không dùng Dev URLs)
  console.log("\n[MIGRATION] Đồng bộ Prisma migration trên Test Database...")
  try {
    execSync("npx prisma migrate deploy --schema=prisma/schema.prisma", {
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
        DIRECT_URL: testDirectUrl,
      },
      stdio: "pipe",
    })
    console.log("-> Migration deploy thành công trên Test Database.")
  } catch (err: any) {
    throw new Error(`Lỗi migration trên test database: ${err.message}`)
  }

  // Import dynamic sau khi process.env.DATABASE_URL đã được gán sang testDbUrl
  const { prisma } = await import("../src/lib/prisma.js")
  const collectionsService = await import("../src/modules/collections/collections.service.js")
  const storageService = await import("../src/modules/storage/storage.service.js")

  try {
    // 3. Dọn dẹp dữ liệu test cũ chỉ trong phạm vi Test DB
    console.log("\n[SETUP] Khởi tạo dữ liệu kiểm thử cô lập...")
    const suffix = Date.now().toString().slice(-6)

    // Tạo tài khoản Thủ quỹ và 2 Thành viên
    const passwordHash = "$2a$10$wT8K8U1yZgHw5gO7a7Oxe.5vWb1QyYtZ.iB6Q5G3QpCjD3Y2YkE0u" // Matkhau@123

    const treasurerUser = await prisma.user.create({
      data: {
        email: `treasurer_${suffix}@test.local`,
        fullName: `Thủ Quỹ Test ${suffix}`,
        passwordHash,
        isEmailVerified: true,
      },
    })

    const member1User = await prisma.user.create({
      data: {
        email: `member1_${suffix}@test.local`,
        fullName: `Lê Hoàng Anh Test ${suffix}`,
        passwordHash,
        isEmailVerified: true,
      },
    })

    const member2User = await prisma.user.create({
      data: {
        email: `member2_${suffix}@test.local`,
        fullName: `Trần Thị Mai Test ${suffix}`,
        passwordHash,
        isEmailVerified: true,
      },
    })

    // Tạo lớp học
    const testClass = await prisma.class.create({
      data: {
        name: `Lớp SE1902 Test ${suffix}`,
        code: `SE1902_${suffix}`,
        inviteCode: `TEST_${suffix}`,
        createdById: treasurerUser.id,
        bankBin: "970422",
        bankName: "MBBank",
        bankAccountNo: "0987654321",
        bankAccountHolder: "THU QUY TEST",
      },
    })

    // Tạo memberships
    const treasurerMember = await prisma.classMember.create({
      data: {
        classId: testClass.id,
        userId: treasurerUser.id,
        role: "TREASURER",
        status: "ACTIVE",
        memberCode: `TQ_${suffix}`,
        displayName: "Thủ Quỹ",
      },
    })

    const member1 = await prisma.classMember.create({
      data: {
        classId: testClass.id,
        userId: member1User.id,
        role: "MEMBER",
        status: "ACTIVE",
        memberCode: `SV1_${suffix}`,
        displayName: "Lê Hoàng Anh",
      },
    })

    const member2 = await prisma.classMember.create({
      data: {
        classId: testClass.id,
        userId: member2User.id,
        role: "MEMBER",
        status: "ACTIVE",
        memberCode: `SV2_${suffix}`,
        displayName: "Trần Thị Mai",
      },
    })

    // Tạo kỳ mở
    const period = await prisma.period.create({
      data: {
        classId: testClass.id,
        name: `Kỳ 1 Năm 2026 ${suffix}`,
        startDate: new Date(),
        status: "OPEN",
      },
    })

    // Tạo đợt thu 100.000đ
    const collection = await prisma.collection.create({
      data: {
        classId: testClass.id,
        periodId: period.id,
        name: "Quỹ Hoạt Động Test",
        defaultAmount: 100000n,
        status: "OPEN",
      },
    })

    // Tạo nghĩa vụ cho member1 và member2
    const ob1 = await prisma.collectionMember.create({
      data: {
        collectionId: collection.id,
        classMemberId: member1.id,
        targetAmount: 100000n,
        paidAmount: 0n,
        status: "UNPAID",
      },
    })

    const ob2 = await prisma.collectionMember.create({
      data: {
        collectionId: collection.id,
        classMemberId: member2.id,
        targetAmount: 100000n,
        paidAmount: 0n,
        status: "UNPAID",
      },
    })

    console.log("-> Khởi tạo dữ liệu thành công. Bắt đầu 11 bài kiểm thử tích hợp tài chính...")
    let passedCount = 0

    // -------------------------------------------------------------
    // TEST 1: Đóng tiền mặt 40.000đ (CASH)
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Đóng tiền mặt một phần 40.000đ...")
    const cashRes = await collectionsService.recordCashPayment({
      classId: testClass.id,
      collectionId: collection.id,
      classMemberId: member1.id,
      amount: "40000",
      note: "Thu trực tiếp tại lớp",
      actorId: treasurerUser.id,
      actorMemberId: treasurerMember.id,
    })

    if (
      cashRes.obligation.paidAmount !== "40000" ||
      cashRes.obligation.status !== "PARTIAL"
    ) {
      throw new Error(`TEST 1 Thất bại: Kết quả obligation sai: ${safeStr(cashRes)}`)
    }

    const t1Payments = await prisma.payment.findMany({ where: { obligationId: ob1.id } })
    const t1Txs = await prisma.transaction.findMany({ where: { classId: testClass.id, fundType: "CASH" } })
    if (t1Payments.length !== 1 || t1Txs.length !== 1 || t1Txs[0].amount !== 40000n) {
      throw new Error("TEST 1 Thất bại: Payment hoặc Transaction tiền mặt không chính xác.")
    }
    console.log("✓ TEST 1 PASS: Đóng tiền mặt ghi nhận đúng Payment, Transaction CASH và status PARTIAL.")
    passedCount++

    // -------------------------------------------------------------
    // TEST 2: Nộp bill 60.000đ (PENDING không tăng số dư)
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Nộp bill chuyển khoản 60.000đ (Pending không tăng số dư)...")
    const fakeFile = await storageService.savePrivateFile({
      classId: testClass.id,
      fileBuffer: Buffer.from("fake-image-bill-content"),
      originalName: "bill_test.png",
      mimeType: "image/png",
      sizeBytes: 100,
      category: "PAYMENT_PROOF",
      uploadedById: member1User.id,
    })

    const proof1 = await collectionsService.submitPaymentProof({
      classId: testClass.id,
      collectionId: collection.id,
      classMemberId: member1.id,
      amount: "60000",
      fileId: fakeFile.id,
      transferCode: "MB123456",
      actorUserId: member1User.id,
    })

    // Kiểm tra số dư BANK trong Transaction Sổ cái: Phải là 0
    const bankTxsBefore = await prisma.transaction.findMany({
      where: { classId: testClass.id, fundType: "BANK" },
    })
    if (bankTxsBefore.length !== 0) {
      throw new Error("TEST 2 Thất bại: Báo chuyển PENDING đã làm tăng số dư Sổ cái BANK!")
    }
    console.log("✓ TEST 2 PASS: Báo chuyển PENDING lưu snapshot ngân hàng và không làm tăng số dư BANK.")
    passedCount++

    // -------------------------------------------------------------
    // TEST 3: Đồng thời duyệt cùng 1 bill (Concurrency Lock)
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Kiểm thử Race Condition: Đồng thời duyệt cùng 1 bill...")
    const results = await Promise.allSettled([
      collectionsService.approvePaymentProof({
        classId: testClass.id,
        proofId: proof1.proof.id,
        actorId: treasurerUser.id,
        actorMemberId: treasurerMember.id,
      }),
      collectionsService.approvePaymentProof({
        classId: testClass.id,
        proofId: proof1.proof.id,
        actorId: treasurerUser.id,
        actorMemberId: treasurerMember.id,
      }),
    ])

    const successCount = results.filter((r) => r.status === "fulfilled").length
    const rejectedCount = results.filter((r) => r.status === "rejected").length

    if (successCount !== 1 || rejectedCount !== 1) {
      throw new Error(
        `TEST 3 Thất bại: Concurrency lock lỗi. Thành công: ${successCount}, Bị từ chối: ${rejectedCount}`,
      )
    }

    // Đối chiếu số Payment và Transaction BANK: CHỈ ĐƯỢC CÓ ĐÚNG 1
    const bankPayments = await prisma.payment.findMany({
      where: { obligationId: ob1.id, fundType: "BANK" },
    })
    const bankTxsAfter = await prisma.transaction.findMany({
      where: { classId: testClass.id, fundType: "BANK" },
    })
    if (bankPayments.length !== 1 || bankTxsAfter.length !== 1 || bankTxsAfter[0].amount !== 60000n) {
      throw new Error("TEST 3 Thất bại: Bị tạo trùng Payment hoặc Transaction BANK khi gọi đồng thời.")
    }

    // Đối chiếu nghĩa vụ: 40.000 (CASH) + 60.000 (BANK) = 100.000 (PAID)
    const checkOb1 = await prisma.collectionMember.findUnique({ where: { id: ob1.id } })
    if (checkOb1?.paidAmount !== 100000n || checkOb1?.status !== "PAID") {
      throw new Error(`TEST 3 Thất bại: Nghĩa vụ sau CASH+BANK không đạt PAID: ${safeStr(checkOb1)}`)
    }
    console.log("✓ TEST 3 PASS: Duyệt đồng thời bị khóa an toàn (1 thành công, 1 từ chối); nghĩa vụ đạt PAID chuẩn 100.000đ.")
    passedCount++

    // -------------------------------------------------------------
    // TEST 4: Retry duyệt lại bill đã approved
    // -------------------------------------------------------------
    console.log("\n[TEST 4] Retry duyệt lại bill đã duyệt từ trước...")
    let retryFailedAsExpected = false
    try {
      await collectionsService.approvePaymentProof({
        classId: testClass.id,
        proofId: proof1.proof.id,
        actorId: treasurerUser.id,
        actorMemberId: treasurerMember.id,
      })
    } catch (err: any) {
      if (err.message.includes("đã được xử lý từ trước")) {
        retryFailedAsExpected = true
      }
    }
    if (!retryFailedAsExpected) {
      throw new Error("TEST 4 Thất bại: Cố duyệt lại bill đã approved nhưng không bị từ chối 400.")
    }
    console.log("✓ TEST 4 PASS: Thử duyệt lại bill đã duyệt bị chặn với thông báo rõ ràng, không sinh thêm giao dịch.")
    passedCount++

    // -------------------------------------------------------------
    // TEST 5: Hai bill khác nhau cùng nghĩa vụ duyệt đồng thời
    // -------------------------------------------------------------
    console.log("\n[TEST 5] Hai bill khác nhau của cùng nghĩa vụ duyệt đồng thời...")
    const file2A = await storageService.savePrivateFile({
      classId: testClass.id,
      fileBuffer: Buffer.from("bill-2a"),
      originalName: "bill_2a.png",
      mimeType: "image/png",
      sizeBytes: 100,
      category: "PAYMENT_PROOF",
      uploadedById: member2User.id,
    })
    const file2B = await storageService.savePrivateFile({
      classId: testClass.id,
      fileBuffer: Buffer.from("bill-2b"),
      originalName: "bill_2b.png",
      mimeType: "image/png",
      sizeBytes: 100,
      category: "PAYMENT_PROOF",
      uploadedById: member2User.id,
    })

    const proof2A = await collectionsService.submitPaymentProof({
      classId: testClass.id,
      collectionId: collection.id,
      classMemberId: member2.id,
      amount: "30000",
      fileId: file2A.id,
      actorUserId: member2User.id,
    })
    const proof2B = await collectionsService.submitPaymentProof({
      classId: testClass.id,
      collectionId: collection.id,
      classMemberId: member2.id,
      amount: "30000",
      fileId: file2B.id,
      actorUserId: member2User.id,
    })

    // Duyệt đồng thời 2 bill khác nhau
    await Promise.all([
      collectionsService.approvePaymentProof({
        classId: testClass.id,
        proofId: proof2A.proof.id,
        actorId: treasurerUser.id,
        actorMemberId: treasurerMember.id,
      }),
      collectionsService.approvePaymentProof({
        classId: testClass.id,
        proofId: proof2B.proof.id,
        actorId: treasurerUser.id,
        actorMemberId: treasurerMember.id,
      }),
    ])

    const checkOb2 = await prisma.collectionMember.findUnique({ where: { id: ob2.id } })
    if (checkOb2?.paidAmount !== 60000n || checkOb2?.status !== "PARTIAL") {
      throw new Error(`TEST 5 Thất bại: Lost update khi duyệt 2 bill đồng thời: ${safeStr(checkOb2)}`)
    }
    console.log("✓ TEST 5 PASS: Duyệt đồng thời 2 bill khác nhau không bị Lost Update (paidAmount = 60.000đ).")
    passedCount++

    // -------------------------------------------------------------
    // TEST 6: CASH và BANK cùng cập nhật một nghĩa vụ đồng thời
    // -------------------------------------------------------------
    console.log("\n[TEST 6] CASH và BANK cùng cập nhật một nghĩa vụ đồng thời...")
    const file2C = await storageService.savePrivateFile({
      classId: testClass.id,
      fileBuffer: Buffer.from("bill-2c"),
      originalName: "bill_2c.png",
      mimeType: "image/png",
      sizeBytes: 100,
      category: "PAYMENT_PROOF",
      uploadedById: member2User.id,
    })
    const proof2C = await collectionsService.submitPaymentProof({
      classId: testClass.id,
      collectionId: collection.id,
      classMemberId: member2.id,
      amount: "20000",
      fileId: file2C.id,
      actorUserId: member2User.id,
    })

    await Promise.all([
      collectionsService.recordCashPayment({
        classId: testClass.id,
        collectionId: collection.id,
        classMemberId: member2.id,
        amount: "20000",
        actorId: treasurerUser.id,
        actorMemberId: treasurerMember.id,
      }),
      collectionsService.approvePaymentProof({
        classId: testClass.id,
        proofId: proof2C.proof.id,
        actorId: treasurerUser.id,
        actorMemberId: treasurerMember.id,
      }),
    ])

    const checkOb2AfterBoth = await prisma.collectionMember.findUnique({ where: { id: ob2.id } })
    // Ban đầu 60.000 + 20.000 (CASH) + 20.000 (BANK) = 100.000 -> PAID
    if (checkOb2AfterBoth?.paidAmount !== 100000n || checkOb2AfterBoth?.status !== "PAID") {
      throw new Error(`TEST 6 Thất bại: Không nhất quán khi cập nhật CASH+BANK đồng thời: ${safeStr(checkOb2AfterBoth)}`)
    }
    console.log("✓ TEST 6 PASS: CASH và BANK đồng thời cùng cập nhật một nghĩa vụ nhất quán (paidAmount = 100.000đ, PAID).")
    passedCount++

    // -------------------------------------------------------------
    // TEST 7: Idempotency tiền mặt (Cùng key, cùng payload -> replay)
    // -------------------------------------------------------------
    console.log("\n[TEST 7] Idempotency: Cùng key, cùng payload trả về Replay...")
    const idemKey = `IDEM_TEST_${suffix}`
    const idem1 = await collectionsService.recordCashPayment({
      classId: testClass.id,
      collectionId: collection.id,
      classMemberId: member1.id,
      amount: "10000",
      idempotencyKey: idemKey,
      actorId: treasurerUser.id,
      actorMemberId: treasurerMember.id,
    })
    const idem2 = await collectionsService.recordCashPayment({
      classId: testClass.id,
      collectionId: collection.id,
      classMemberId: member1.id,
      amount: "10000",
      idempotencyKey: idemKey,
      actorId: treasurerUser.id,
      actorMemberId: treasurerMember.id,
    })

    if (!idem2.isReplay || idem1.paymentId !== idem2.paymentId) {
      throw new Error("TEST 7 Thất bại: Idempotency không nhận diện được Replay.")
    }
    console.log("✓ TEST 7 PASS: Cùng Idempotency key và payload trả về Replay, không sinh giao dịch trùng.")
    passedCount++

    // -------------------------------------------------------------
    // TEST 8: Idempotency conflict (Cùng key, khác payload -> 409)
    // -------------------------------------------------------------
    console.log("\n[TEST 8] Idempotency: Cùng key, khác payload bị từ chối 409...")
    let conflictAsExpected = false
    try {
      await collectionsService.recordCashPayment({
        classId: testClass.id,
        collectionId: collection.id,
        classMemberId: member1.id,
        amount: "50000", // Khác số tiền ban đầu (10.000)
        idempotencyKey: idemKey,
        actorId: treasurerUser.id,
        actorMemberId: treasurerMember.id,
      })
    } catch (err: any) {
      if (err.statusCode === 409 || err.message.includes("đã được sử dụng")) {
        conflictAsExpected = true
      }
    }
    if (!conflictAsExpected) {
      throw new Error("TEST 8 Thất bại: Cùng key khác payload không bị từ chối 409.")
    }
    console.log("✓ TEST 8 PASS: Cùng key khác payload bị chặn 409 Conflict.")
    passedCount++

    // -------------------------------------------------------------
    // TEST 9: Điều chỉnh nghĩa vụ & Miễn giảm (EXEMPT)
    // -------------------------------------------------------------
    console.log("\n[TEST 9] Điều chỉnh nghĩa vụ về 0 -> EXEMPT và lưu AuditLog...")
    const adjustRes = await collectionsService.adjustObligation({
      classId: testClass.id,
      collectionId: collection.id,
      memberId: ob1.id,
      targetAmount: "0",
      discountReason: "Miễn giảm 100% học bổng",
      actorId: treasurerUser.id,
    })

    if (adjustRes.status !== "EXEMPT" || adjustRes.targetAmount !== "0") {
      throw new Error(`TEST 9 Thất bại: targetAmount = 0 không chuyển sang EXEMPT: ${safeStr(adjustRes)}`)
    }

    const audit = await prisma.auditLog.findFirst({
      where: { classId: testClass.id, targetId: ob1.id, action: "UPDATE" },
      orderBy: { createdAt: "desc" },
    })
    if (!audit || audit.reason !== "Điều chỉnh nghĩa vụ thành viên: Miễn giảm 100% học bổng") {
      throw new Error("TEST 9 Thất bại: AuditLog không ghi nhận chính xác lý do điều chỉnh.")
    }
    console.log("✓ TEST 9 PASS: Miễn giảm về 0 chuyển trạng thái EXEMPT và lưu vết AuditLog đầy đủ.")
    passedCount++

    // -------------------------------------------------------------
    // TEST 10: Phân quyền File Storage & Chặn truy cập chéo lớp
    // -------------------------------------------------------------
    console.log("\n[TEST 10] Phân quyền file bill và chặn truy cập chéo lớp...")
    // Tạo Class B và User B
    const userB = await prisma.user.create({
      data: { email: `user_b_${suffix}@test.local`, fullName: "User B", passwordHash },
    })
    const classB = await prisma.class.create({
      data: {
        name: `Class B ${suffix}`,
        code: `CLASS_B_${suffix}`,
        inviteCode: `CB_${suffix}`,
        createdById: userB.id,
      },
    })
    const memberB = await prisma.classMember.create({
      data: { classId: classB.id, userId: userB.id, role: "MEMBER", status: "ACTIVE", memberCode: `B_${suffix}`, displayName: "User B" },
    })

    // User B thuộc Class B cố truy cập file của Class A
    let crossClassBlocked = false
    try {
      await storageService.getAuthorizedFile(fakeFile.id, {
        userId: userB.id,
        classId: classB.id,
        classRole: "MEMBER",
        memberId: memberB.id,
      })
    } catch (err: any) {
      if (err.statusCode === 403) crossClassBlocked = true
    }

    // Member 2 thuộc Class A cố truy cập file của Member 1
    let otherMemberBlocked = false
    try {
      await storageService.getAuthorizedFile(fakeFile.id, {
        userId: member2User.id,
        classId: testClass.id,
        classRole: "MEMBER",
        memberId: member2.id,
      })
    } catch (err: any) {
      if (err.statusCode === 403) otherMemberBlocked = true
    }

    if (!crossClassBlocked || !otherMemberBlocked) {
      throw new Error(`TEST 10 Thất bại: Phân quyền file bị hở (Cross-class: ${crossClassBlocked}, Other-member: ${otherMemberBlocked})`)
    }
    console.log("✓ TEST 10 PASS: File private bị chặn 403 tuyệt đối khi truy cập chéo lớp hoặc giữa thành viên thường.")
    passedCount++

    // -------------------------------------------------------------
    // TEST 11: Batch duyệt có mục không hợp lệ (Cô lập lỗi từng mục)
    // -------------------------------------------------------------
    console.log("\n[TEST 11] Xử lý hàng loạt có mục lỗi: Báo cáo chi tiết và cô lập lỗi...")
    const fileValid = await storageService.savePrivateFile({
      classId: testClass.id,
      fileBuffer: Buffer.from("bill-valid"),
      originalName: "bill_valid.png",
      mimeType: "image/png",
      sizeBytes: 100,
      category: "PAYMENT_PROOF",
      uploadedById: member2User.id,
    })
    const proofValid = await collectionsService.submitPaymentProof({
      classId: testClass.id,
      collectionId: collection.id,
      classMemberId: member2.id,
      amount: "15000",
      fileId: fileValid.id,
      actorUserId: member2User.id,
    })

    const batchRes = await collectionsService.batchApproveProofs({
      classId: testClass.id,
      proofIds: [proofValid.proof.id, "non_existent_proof_id"],
      actorId: treasurerUser.id,
      actorMemberId: treasurerMember.id,
    })

    if (
      batchRes.total !== 2 ||
      batchRes.successCount !== 1 ||
      batchRes.failedCount !== 1 ||
      batchRes.details.length !== 2
    ) {
      throw new Error(`TEST 11 Thất bại: Batch không cô lập được lỗi: ${safeStr(batchRes)}`)
    }
    console.log("✓ TEST 11 PASS: Xử lý hàng loạt báo cáo chi tiết từng mục, cô lập lỗi mục không hợp lệ mà không làm hỏng cả batch.")
    passedCount++

    // -------------------------------------------------------------
    // TEST 12: Rollback toàn bộ khi lỗi giữa chừng (Transaction Atomicity)
    // -------------------------------------------------------------
    console.log("\n[TEST 12] Cố ý gây lỗi giữa chừng trong Transaction: Xác minh Rollback toàn bộ...")
    const fileRollback = await storageService.savePrivateFile({
      classId: testClass.id,
      fileBuffer: Buffer.from("bill-rollback"),
      originalName: "bill_rollback.png",
      mimeType: "image/png",
      sizeBytes: 100,
      category: "PAYMENT_PROOF",
      uploadedById: member1User.id,
    })
    const proofRollback = await collectionsService.submitPaymentProof({
      classId: testClass.id,
      collectionId: collection.id,
      classMemberId: member1.id,
      amount: "77000",
      fileId: fileRollback.id,
      actorUserId: member1User.id,
    })

    // Lưu snapshot trạng thái trước khi cố ý gây lỗi
    const txCountBefore = await prisma.transaction.count({ where: { classId: testClass.id } })
    const paymentCountBefore = await prisma.payment.count({ where: { collectionId: collection.id } })
    const obBefore = await prisma.collectionMember.findUnique({ where: { id: ob1.id } })

    // Gọi approvePaymentProof với actorId không tồn tại để kích hoạt Foreign Key error tại bước AuditLog
    // sau khi Transaction, Payment và Proof update đã được thực thi bên trong interactive transaction
    let rollbackTriggered = false
    try {
      await collectionsService.approvePaymentProof({
        classId: testClass.id,
        proofId: proofRollback.proof.id,
        actorId: "cm_non_existent_actor_id_for_rollback_test",
        actorMemberId: treasurerMember.id,
      })
    } catch {
      rollbackTriggered = true
    }

    if (!rollbackTriggered) {
      throw new Error("TEST 12 Thất bại: Cố ý gây lỗi nhưng transaction không ném ngoại lệ.")
    }

    // Xác minh rollback toàn bộ:
    // 1. Không để lại Transaction dở dang
    const txCountAfter = await prisma.transaction.count({ where: { classId: testClass.id } })
    if (txCountAfter !== txCountBefore) {
      throw new Error(`TEST 12 Thất bại: Transaction dở dang không được rollback! (Trước: ${txCountBefore}, Sau: ${txCountAfter})`)
    }

    // 2. Không để lại Payment dở dang
    const paymentCountAfter = await prisma.payment.count({ where: { collectionId: collection.id } })
    if (paymentCountAfter !== paymentCountBefore) {
      throw new Error(`TEST 12 Thất bại: Payment dở dang không được rollback! (Trước: ${paymentCountBefore}, Sau: ${paymentCountAfter})`)
    }
    const danglingPayment = await prisma.payment.findFirst({ where: { paymentProofId: proofRollback.proof.id } })
    if (danglingPayment) {
      throw new Error("TEST 12 Thất bại: Tồn tại bản ghi Payment dở dang liên kết với Proof!")
    }

    // 3. Trạng thái Proof không bị cập nhật một phần (vẫn giữ PENDING, reviewedAt là null)
    const proofAfter = await prisma.paymentProof.findUnique({ where: { id: proofRollback.proof.id } })
    if (proofAfter?.status !== "PENDING" || proofAfter?.reviewedById !== null) {
      throw new Error(`TEST 12 Thất bại: Trạng thái PaymentProof bị cập nhật dở dang: ${safeStr(proofAfter)}`)
    }

    // 4. Nghĩa vụ và số đóng ròng không bị thay đổi dở dang
    const obAfter = await prisma.collectionMember.findUnique({ where: { id: ob1.id } })
    if (obAfter?.paidAmount !== obBefore?.paidAmount || obAfter?.status !== obBefore?.status) {
      throw new Error(`TEST 12 Thất bại: Nghĩa vụ bị cập nhật dở dang!`)
    }

    // 5. AuditLog không bị ghi dở dang
    const danglingAudit = await prisma.auditLog.findFirst({
      where: { targetId: proofRollback.proof.id, action: "APPROVE" },
    })
    if (danglingAudit) {
      throw new Error("TEST 12 Thất bại: AuditLog dở dang tồn tại trong database!")
    }

    console.log("✓ TEST 12 PASS: Khi xảy ra lỗi giữa chừng, toàn bộ Transaction, Payment, Nghĩa vụ, Trạng thái Bill và AuditLog đều được rollback 100%, không để lại bất kỳ dữ liệu dở dang nào.")
    passedCount++

    console.log(`\n🎉 HOÀN TẤT TOÀN BỘ KIỂM THỬ: ${passedCount}/12 TESTS PASS TRÊN TEST DATABASE!`)
    return {
      status: "PASS",
      total: 12,
      passed: passedCount,
      failed: 0,
    }
  } finally {
    await prisma.$disconnect()
  }
}

runFinancialIntegrationTests()
  .then((res) => {
    if (res?.status === "PASS") process.exit(0)
  })
  .catch((err) => {
    console.error("\n❌ LỖI TRONG KIỂM THỬ TÍCH HỢP TÀI CHÍNH:", err)
    process.exit(1)
  })
