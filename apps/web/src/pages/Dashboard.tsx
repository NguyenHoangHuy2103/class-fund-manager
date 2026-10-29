import { useState, useEffect } from "react"
import {
  Badge,
  Button,
  Card,
  Drawer,
  Icon,
  Input,
  Modal,
} from "../components/ui"
import { navigate } from "../lib/router"
import { useStore } from "../lib/store"
import { api, API_BASE } from "../lib/api"
import { useRealtimeRefresh } from "../lib/realtime"

function formatVnd(val?: string | number | bigint): string {
  if (!val && val !== 0) return "0 đ"
  const n = typeof val === "string" ? BigInt(val || 0) : BigInt(val)
  return new Intl.NumberFormat("vi-VN").format(n) + " đ"
}

export default function Dashboard() {
  const { user, activeClass, activeMembership, role, refreshUser } = useStore()
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Bank config modal state
  const [showBankModal, setShowBankModal] = useState(false)
  const [bankBin, setBankBin] = useState(activeClass?.bankBin || "970422") // Mặc định MBBank
  const [bankName, setBankName] = useState(activeClass?.bankName || "MBBank")
  const [bankAccountNo, setBankAccountNo] = useState(activeClass?.bankAccountNo || "")
  const [bankAccountHolder, setBankAccountHolder] = useState(activeClass?.bankAccountHolder || "")
  const [savingBank, setSavingBank] = useState(false)
  const [bankMsg, setBankMsg] = useState<string | null>(null)

  // Pending proofs drawer state (xử lý ngay tại Tổng quan)
  const [showProofDrawer, setShowProofDrawer] = useState(false)
  const [pendingProofs, setPendingProofs] = useState<any[]>([])
  const [loadingProofs, setLoadingProofs] = useState(false)
  const [selectedProofIds, setSelectedProofIds] = useState<string[]>([])
  const [actualAmounts, setActualAmounts] = useState<Record<string, string>>({})
  const [batchApproving, setBatchApproving] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // Quick view bill & reject modal
  const [viewImageModal, setViewImageModal] = useState<string | null>(null)
  const [rejectModalProof, setRejectModalProof] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejecting, setRejecting] = useState(false)

  const isTreasurer = role === "TREASURER"
  const displayName = activeMembership?.displayName || user?.fullName || ""
  const activePeriod = activeClass?.periods?.find((p) => p.status === "OPEN")

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.dashboard.overview()
      setData(res.data)
      if (res.data.classInfo) {
        setBankBin(res.data.classInfo.bankBin || "970422")
        setBankName(res.data.classInfo.bankName || "MBBank")
        setBankAccountNo(res.data.classInfo.bankAccountNo || "")
        setBankAccountHolder(res.data.classInfo.bankAccountHolder || "")
      }
    } catch (err: any) {
      if (!silent) setError(err.message || "Không thể tải dữ liệu bảng điều khiển.")
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Tự động làm mới dữ liệu thời gian thực khi có sự kiện (Real-time SSE & Focus change)
  useRealtimeRefresh(() => {
    loadData(true)
    if (isTreasurer) {
      loadPendingProofs()
    }
  })

  const loadPendingProofs = async () => {
    try {
      setLoadingProofs(true)
      const res = await api.collections.getProofs(undefined, "PENDING")
      const list = res.data.proofs || []
      setPendingProofs(list)
      const initialAmounts: Record<string, string> = {}
      for (const p of list) {
        initialAmounts[p.id] = p.amount
      }
      setActualAmounts(initialAmounts)
      setSelectedProofIds([])
    } catch (err: any) {
      setActionMessage({ text: err.message || "Lỗi tải danh sách bằng chứng", type: "error" })
    } finally {
      setLoadingProofs(false)
    }
  }

  const handleOpenDrawer = () => {
    setShowProofDrawer(true)
    setActionMessage(null)
    loadPendingProofs()
  }

  const handleApproveProof = async (proofId: string) => {
    const actAmt = actualAmounts[proofId]
    try {
      const res = await api.collections.approveProof(proofId, actAmt)
      setActionMessage({
        text: `Đã duyệt thành công ${formatVnd(res.data.amount)} (Mã GD: ${res.data.transactionCode})`,
        type: "success",
      })
      // Cập nhật lại số dư và danh sách ngay tại chỗ không cần reload trang
      await Promise.all([loadData(), loadPendingProofs()])
    } catch (err: any) {
      setActionMessage({ text: err.message || "Lỗi duyệt bằng chứng", type: "error" })
    }
  }

  const handleBatchApprove = async () => {
    if (selectedProofIds.length === 0) return
    setBatchApproving(true)
    try {
      const res = await api.collections.batchApproveProofs(selectedProofIds)
      const okCount = res.data.successCount
      const failCount = res.data.failedCount
      setActionMessage({
        text: `Đã duyệt thành công ${okCount}/${selectedProofIds.length} phiếu! ${failCount > 0 ? `(${failCount} phiếu thất bại)` : ""}`,
        type: okCount > 0 ? "success" : "error",
      })
      setSelectedProofIds([])
      await Promise.all([loadData(), loadPendingProofs()])
    } catch (err: any) {
      setActionMessage({ text: err.message || "Lỗi duyệt hàng loạt", type: "error" })
    } finally {
      setBatchApproving(false)
    }
  }

  const handleRejectProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectModalProof || !rejectReason.trim()) return
    setRejecting(true)
    try {
      await api.collections.rejectProof(rejectModalProof.id, rejectReason.trim())
      setActionMessage({ text: "Đã từ chối bằng chứng chuyển khoản thành công", type: "success" })
      setRejectModalProof(null)
      setRejectReason("")
      await Promise.all([loadData(), loadPendingProofs()])
    } catch (err: any) {
      setActionMessage({ text: err.message || "Lỗi từ chối bằng chứng", type: "error" })
    } finally {
      setRejecting(false)
    }
  }

  useEffect(() => {
    if (activeClass?.id) {
      loadData()
    }
  }, [activeClass?.id])

  const copyInvite = () => {
    if (activeClass?.inviteCode) {
      navigator.clipboard.writeText(activeClass.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBank(true)
    setBankMsg(null)
    try {
      await api.classes.updateBankConfig({
        bankBin,
        bankName,
        bankAccountNo,
        bankAccountHolder,
      })
      setBankMsg("Cập nhật tài khoản ngân hàng thành công!")
      await refreshUser()
      await loadData()
      setTimeout(() => setShowBankModal(false), 1200)
    } catch (err: any) {
      setBankMsg(err.message || "Không thể lưu cấu hình ngân hàng.")
    } finally {
      setSavingBank(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-ink via-ink/90 to-brand p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-mist">
                Lớp học: {activeClass?.code}
              </span>
              <Badge tone={isTreasurer ? "warn" : "info"}>
                {isTreasurer ? "Thủ quỹ" : "Thành viên"}
              </Badge>
            </div>
            <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              Chào mừng, {displayName}!
            </h2>
            <p className="mt-1 text-sm text-white/80">
              {activeClass?.name} • {activePeriod?.name || "Học kỳ 1"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isTreasurer && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowBankModal(true)}
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                >
                  <Icon name="credit-card" size={18} />
                  Tài khoản nhận tiền (QR)
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate("/collections")}
                  className="bg-white text-ink hover:bg-tint"
                >
                  <Icon name="plus-circle" size={18} />
                  Quản lý thu quỹ
                </Button>
              </>
            )}
            {!isTreasurer && (
              <Button
                variant="primary"
                onClick={() => navigate("/collections")}
                className="bg-white text-ink hover:bg-tint font-semibold"
              >
                <Icon name="wallet" size={18} />
                Đóng tiền quỹ
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* THÔNG BÁO LỖI NẾU CÓ */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      {/* 3 THẺ SỐ DƯ QUỸ (LEDGER SSOT) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Tổng quỹ */}
        <Card className="p-5 border-l-4 border-l-brand">
          <div className="flex items-center justify-between text-subtle text-xs font-semibold">
            <span>TỔNG SỐ DƯ QUỸ LỚP</span>
            <Icon name="wallet" size={18} className="text-brand" />
          </div>
          <div className="mt-2 text-2xl font-black text-ink sm:text-3xl">
            {loading ? "..." : formatVnd(data?.balances?.totalBalance)}
          </div>
          <p className="mt-1 text-xs text-subtle">
            Nguồn sự thật duy nhất từ Sổ cái
          </p>
        </Card>

        {/* Tiền mặt */}
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-subtle text-xs font-semibold">
            <span>QUỸ TIỀN MẶT (CASH)</span>
            <Icon name="coins" size={18} className="text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700 sm:text-3xl">
            {loading ? "..." : formatVnd(data?.balances?.cashBalance)}
          </div>
          <p className="mt-1 text-xs text-subtle">
            Thu & giữ tiền mặt tại chỗ
          </p>
        </Card>

        {/* Ngân hàng */}
        <Card className="p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-subtle text-xs font-semibold">
            <span>TÀI KHOẢN NGÂN HÀNG (BANK)</span>
            <Icon name="credit-card" size={18} className="text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-700 sm:text-3xl">
            {loading ? "..." : formatVnd(data?.balances?.bankBalance)}
          </div>
          <p className="mt-1 text-xs text-subtle">
            Chuyển khoản qua Napas247 / VietQR
          </p>
        </Card>
      </div>

      {/* CẢNH BÁO CHO THỦ QUỸ: BILL CHỜ DUYỆT */}
      {isTreasurer && data?.pendingProofCount > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="clock" size={24} className="text-amber-600" />
            <div>
              <p className="font-bold text-sm">
                Có {data.pendingProofCount} bằng chứng chuyển khoản đang chờ duyệt!
              </p>
              <p className="text-xs text-amber-700">
                Thành viên đã tải ảnh bill chuyển khoản, vui lòng kiểm tra và duyệt để ghi nhận vào quỹ.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            className="bg-amber-600 text-white hover:bg-amber-700 font-semibold cursor-pointer shrink-0"
            onClick={handleOpenDrawer}
          >
            Duyệt ngay tại đây
          </Button>
        </div>
      )}

      {/* CẢNH BÁO CHO THÀNH VIÊN: KHOẢN CẦN ĐÓNG */}
      {!isTreasurer && data?.personalTotalDue && BigInt(data.personalTotalDue) > 0n && (
        <div className="rounded-xl border border-brand/30 bg-tint/60 p-4 text-ink shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="alert-circle" size={24} className="text-brand" />
            <div>
              <p className="font-bold text-sm">
                Bạn có khoản quỹ cần hoàn thành: {formatVnd(data.personalTotalDue)}
              </p>
              <p className="text-xs text-subtle">
                Vui lòng quét mã VietQR hoặc nộp tiền mặt cho Thủ quỹ trước hạn đóng.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate("/collections")}
          >
            Đóng quỹ ngay
          </Button>
        </div>
      )}

      {/* THÔNG TIN LỚP & KỲ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between text-subtle text-xs font-semibold">
            <span>Mã mời tham gia lớp</span>
            <Icon name="link" size={16} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-2xl font-black tracking-wider text-ink">
              {activeClass?.inviteCode || "—"}
            </span>
            <Button size="sm" variant="secondary" onClick={copyInvite}>
              {copied ? "Đã chép!" : "Sao chép"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-subtle">
            Chia sẻ mã này để các bạn khác trong lớp tham gia.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-subtle text-xs font-semibold">
            <span>Tài khoản ngân hàng của lớp</span>
            <Icon name="credit-card" size={16} />
          </div>
          <div className="mt-2">
            {activeClass?.bankAccountNo ? (
              <div>
                <p className="text-sm font-bold text-ink">
                  {activeClass.bankName} - {activeClass.bankAccountNo}
                </p>
                <p className="text-xs text-subtle uppercase">
                  {activeClass.bankAccountHolder}
                </p>
                <Badge tone="success" className="mt-1">Đã cấu hình VietQR</Badge>
              </div>
            ) : (
              <div>
                <p className="text-xs text-amber-700">Chưa cấu hình ngân hàng</p>
                {isTreasurer && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2 text-xs"
                    onClick={() => setShowBankModal(true)}
                  >
                    Thiết lập ngay
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-subtle text-xs font-semibold">
            <span>Kỳ hoạt động</span>
            <Icon name="calendar" size={16} />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-ink">
              {activePeriod?.name || "Học kỳ 1"}
            </span>
            <div className="mt-1">
              <Badge tone="success">Đang mở (OPEN)</Badge>
            </div>
          </div>
          <p className="mt-2 text-xs text-subtle">
            Mọi đợt thu chi thuộc kỳ này
          </p>
        </Card>
      </div>

      {/* PHẦN DÀNH RIÊNG CHO THÀNH VIÊN: CÁC NGHĨA VỤ ĐÓNG CỦA TÔI */}
      {!isTreasurer && data?.personalObligations && (
        <Card className="p-5">
          <h3 className="font-bold text-base text-ink mb-3 flex items-center gap-2">
            <Icon name="wallet" size={18} className="text-brand" />
            Nghĩa vụ đóng quỹ của bạn
          </h3>
          {data.personalObligations.length === 0 ? (
            <p className="text-subtle text-sm">Hiện tại bạn không có khoản thu quỹ nào cần đóng.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.personalObligations.map((ob: any) => (
                <div key={ob.collectionId} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-ink">{ob.collectionName}</p>
                    <p className="text-xs text-subtle">
                      Mục tiêu: {formatVnd(ob.targetAmount)} • Đã đóng: {formatVnd(ob.paidAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {BigInt(ob.remainingAmount) > 0n ? (
                        <p className="text-sm font-bold text-rose-600">
                          Còn thiếu: {formatVnd(ob.remainingAmount)}
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-emerald-600">Đã đủ</p>
                      )}
                      <Badge
                        tone={
                          ob.status === "PAID"
                            ? "success"
                            : ob.status === "PARTIAL"
                            ? "warn"
                            : ob.status === "EXEMPT"
                            ? "neutral"
                            : "danger"
                        }
                      >
                        {ob.status === "PAID"
                          ? "Đã đóng đủ"
                          : ob.status === "PARTIAL"
                          ? "Đóng một phần"
                          : ob.status === "EXEMPT"
                          ? "Miễn đóng"
                          : "Chưa đóng"}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => navigate("/collections")}
                    >
                      Đóng
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* LỊCH SỬ GIAO DỊCH THU CHI GẦN ĐÂY */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base text-ink flex items-center gap-2">
            <Icon name="book" size={18} className="text-brand" />
            Giao dịch Sổ quỹ gần đây
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/ledger")}
          >
            Xem tất cả Sổ quỹ →
          </Button>
        </div>

        {loading ? (
          <p className="text-subtle text-sm">Đang tải sổ quỹ...</p>
        ) : !data?.recentTransactions || data.recentTransactions.length === 0 ? (
          <p className="text-subtle text-sm">Chưa có giao dịch thu chi nào được ghi nhận trong kỳ này.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.recentTransactions.map((tx: any) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-subtle">{tx.code}</span>
                    <Badge tone={tx.fundType === "CASH" ? "success" : "info"}>
                      {tx.fundType === "CASH" ? "Tiền mặt" : "Ngân hàng"}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-ink mt-0.5">{tx.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-emerald-600">
                    +{formatVnd(tx.amount)}
                  </span>
                  <p className="text-xs text-subtle">
                    {new Date(tx.date).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* MODAL CẤU HÌNH NGÂN HÀNG CỦA LỚP */}
      {showBankModal && (
        <Modal
          onClose={() => setShowBankModal(false)}
          title="Cấu hình tài khoản ngân hàng của Lớp"
        >
          <form onSubmit={handleSaveBank} className="space-y-4">
            <p className="text-xs text-subtle">
              Thông tin ngân hàng này được dùng để tự động sinh mã VietQR Napas247 điền sẵn số tiền và nội dung chuyển khoản cho sinh viên đóng quỹ.
            </p>

            {bankMsg && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold ${
                  bankMsg.includes("thành công")
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {bankMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Ngân hàng nhận tiền (Mã BIN)
              </label>
              <select
                value={bankBin}
                onChange={(e) => {
                  setBankBin(e.target.value)
                  const opt = e.target.selectedOptions[0]
                  if (opt) setBankName(opt.text.split(" - ")[0])
                }}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              >
                <option value="970422">MBBank - Ngân hàng Quân Đội (970422)</option>
                <option value="970436">Vietcombank - Ngoại thương (970436)</option>
                <option value="970415">VietinBank - Công thương (970415)</option>
                <option value="970418">BIDV - Đầu tư và Phát triển (970418)</option>
                <option value="970407">Techcombank - Kỹ thương (970407)</option>
                <option value="970423">TPBank - Tiên Phong (970423)</option>
                <option value="970432">VPBank - Việt Nam Thịnh Vượng (970432)</option>
                <option value="970405">Agribank - Nông nghiệp (970405)</option>
                <option value="970441">VIB - Quốc tế (970441)</option>
                <option value="970416">ACB - Á Châu (970416)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Số tài khoản ngân hàng
              </label>
              <Input
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
                placeholder="VD: 0987654321"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Tên chủ tài khoản (In hoa không dấu)
              </label>
              <Input
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value.toUpperCase())}
                placeholder="VD: NGUYEN VAN THU QUY"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowBankModal(false)}
              >
                Hủy
              </Button>
              <Button type="submit" variant="primary" disabled={savingBank}>
                {savingBank ? "Đang lưu..." : "Lưu cấu hình"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DRAWER DUYỆT BÁO CHUYỂN KHOẢN NGAY TẠI TỔNG QUAN */}
      {showProofDrawer && (
        <Drawer
          title="Báo chuyển khoản chờ xác nhận"
          subtitle={`Có ${pendingProofs.length} phiếu đang chờ phê duyệt`}
          onClose={() => {
            setShowProofDrawer(false)
            setActionMessage(null)
          }}
          footer={
            <div className="flex w-full items-center justify-between">
              <span className="text-xs text-subtle">
                Đã chọn: <b>{selectedProofIds.length}</b>/{pendingProofs.length} phiếu
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowProofDrawer(false)}
                >
                  Đóng
                </Button>
                {selectedProofIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={batchApproving}
                    onClick={handleBatchApprove}
                  >
                    {batchApproving
                      ? "Đang duyệt..."
                      : `Duyệt ${selectedProofIds.length} phiếu đã chọn`}
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Thông báo kết quả thao tác */}
            {actionMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  actionMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {actionMessage.text}
              </div>
            )}

            {/* Thanh công cụ chọn hàng loạt */}
            {pendingProofs.length > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-border rounded-xl text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={
                      selectedProofIds.length === pendingProofs.length &&
                      pendingProofs.length > 0
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProofIds(pendingProofs.map((p) => p.id))
                      } else {
                        setSelectedProofIds([])
                      }
                    }}
                    className="rounded border-border text-brand focus:ring-brand size-4"
                  />
                  <span>Chọn tất cả ({pendingProofs.length} phiếu)</span>
                </label>
                {selectedProofIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={batchApproving}
                    onClick={handleBatchApprove}
                    className="text-xs py-1 h-7"
                  >
                    {batchApproving ? "..." : `Duyệt nhanh (${selectedProofIds.length})`}
                  </Button>
                )}
              </div>
            )}

            {/* Danh sách phiếu chờ duyệt */}
            {loadingProofs ? (
              <p className="p-6 text-center text-sm text-subtle">
                Đang tải danh sách bằng chứng...
              </p>
            ) : pendingProofs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-border space-y-2">
                <Icon name="check-circle" size={36} className="mx-auto text-emerald-600" />
                <p className="text-sm font-bold text-ink">
                  Tuyệt vời! Không còn báo chuyển nào chờ duyệt
                </p>
                <p className="text-xs text-subtle">
                  Tất cả các khoản chuyển khoản đóng quỹ đều đã được kiểm tra và ghi nhận vào Sổ cái.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingProofs.map((p) => {
                  const isChecked = selectedProofIds.includes(p.id)
                  const actVal = actualAmounts[p.id] ?? p.amount
                  const billUrl = `${API_BASE}/storage/files/${p.file?.id || p.fileId}`

                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isChecked
                          ? "border-brand bg-brand/5 shadow-sm"
                          : "border-border bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProofIds([...selectedProofIds, p.id])
                              } else {
                                setSelectedProofIds(
                                  selectedProofIds.filter((id) => id !== p.id),
                                )
                              }
                            }}
                            className="mt-1 rounded border-border text-brand focus:ring-brand size-4"
                          />
                          <div>
                            <p className="text-sm font-bold text-ink">
                              {p.classMember?.displayName || p.displayName}
                            </p>
                            <p className="text-xs text-subtle font-mono">
                              MSSV: {p.classMember?.memberCode || p.memberCode} •{" "}
                              {p.collectionName || p.collection?.name}
                            </p>
                            <p className="text-[11px] text-subtle mt-0.5">
                              Gửi lúc: {new Date(p.createdAt).toLocaleString("vi-VN")}
                            </p>
                          </div>
                        </div>
                        <Badge tone="warn">Chờ duyệt</Badge>
                      </div>

                      {/* Số tiền khai báo vs Số tiền thực nhận */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                        <div>
                          <span className="text-[11px] text-subtle block">Khai báo:</span>
                          <span className="font-extrabold text-ink text-sm">
                            {formatVnd(p.amount)}
                          </span>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-ink block mb-0.5">
                            Số thực nhận (VND):
                          </label>
                          <Input
                            type="number"
                            min="1000"
                            step="1000"
                            value={actVal}
                            onChange={(e) =>
                              setActualAmounts({
                                ...actualAmounts,
                                [p.id]: e.target.value,
                              })
                            }
                            className="text-xs h-7 py-0 bg-white"
                          />
                        </div>
                      </div>

                      {/* Xem ảnh bill và các thao tác */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setViewImageModal(billUrl)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                        >
                          <Icon name="eye" size={14} />
                          Xem ảnh bill
                        </button>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50 text-xs h-7 px-2"
                            onClick={() => {
                              setRejectModalProof(p)
                              setRejectReason("")
                            }}
                          >
                            Từ chối
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            className="text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            onClick={() => handleApproveProof(p.id)}
                          >
                            Duyệt
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Drawer>
      )}

      {/* MODAL XEM ẢNH BILL PHÓNG TO */}
      {viewImageModal && (
        <Modal
          onClose={() => setViewImageModal(null)}
          title="Ảnh biên lai chuyển khoản"
        >
          <div className="space-y-4 text-center">
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-border bg-slate-50 p-2">
              <img
                src={viewImageModal}
                alt="Bill chuyển khoản"
                className="max-h-full max-w-full mx-auto object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <a
                href={viewImageModal}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand hover:underline"
              >
                Mở trong tab mới ↗
              </a>
              <Button variant="secondary" onClick={() => setViewImageModal(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL TỪ CHỐI BẰNG CHỨNG CHUYỂN KHOẢN */}
      {rejectModalProof && (
        <Modal
          onClose={() => setRejectModalProof(null)}
          title="Từ chối bằng chứng chuyển khoản"
        >
          <form onSubmit={handleRejectProof} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p>
                Thành viên:{" "}
                <b>
                  {rejectModalProof.classMember?.displayName ||
                    rejectModalProof.displayName}
                </b>
              </p>
              <p>
                Số tiền khai báo:{" "}
                <b className="text-rose-600">{formatVnd(rejectModalProof.amount)}</b>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Lý do từ chối (Bắt buộc để thành viên biết và gửi lại bill đúng)
              </label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Không tìm thấy giao dịch ngân hàng, sai số tiền..."
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRejectModalProof(null)}
              >
                Hủy
              </Button>
              <Button type="submit" variant="danger" disabled={rejecting}>
                {rejecting ? "Đang xử lý..." : "Xác nhận từ chối"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
