import { useState, useEffect } from "react"
import {
  Badge,
  Button,
  Card,
  Icon,
  Input,
  Modal,
  PageHeader,
} from "../components/ui"
import { useStore } from "../lib/store"
import { api } from "../lib/api"
import { useRealtimeRefresh } from "../lib/realtime"

function formatVnd(val?: string | number | bigint): string {
  if (!val && val !== 0) return "0 đ"
  const n = typeof val === "string" ? BigInt(val || 0) : BigInt(val)
  return new Intl.NumberFormat("vi-VN").format(n) + " đ"
}

export function Collections() {
  const { role, activeMembership } = useStore()
  const isTreasurer = role === "TREASURER"

  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedColId, setSelectedColId] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [activeTab, setActiveTab] = useState<"members" | "proofs">("members")
  const [proofs, setProofs] = useState<any[]>([])
  const [loadingProofs, setLoadingProofs] = useState(false)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrData, setQrData] = useState<any>(null)
  const [customQrAmount, setCustomQrAmount] = useState("")
  const [showProofModal, setShowProofModal] = useState(false)
  const [showCashModal, setShowCashModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showImageViewModal, setShowImageViewModal] = useState<string | null>(null)

  // Create collection form
  const [colName, setColName] = useState("")
  const [colAmount, setColAmount] = useState("50000")
  const [colDueDate, setColDueDate] = useState("")
  const [colDesc, setColDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const [activeMembers, setActiveMembers] = useState<any[]>([])
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Submit proof form
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofAmount, setProofAmount] = useState("")
  const [proofCode, setProofCode] = useState("")
  const [proofNote, setProofNote] = useState("")
  const [submittingProof, setSubmittingProof] = useState(false)

  // Cash payment form
  const [cashTargetMember, setCashTargetMember] = useState<any>(null)
  const [cashAmount, setCashAmount] = useState("")
  const [cashNote, setCashNote] = useState("")
  const [recordingCash, setRecordingCash] = useState(false)

  // Adjust obligation form
  const [adjustMember, setAdjustMember] = useState<any>(null)
  const [adjustTarget, setAdjustTarget] = useState("")
  const [adjustReason, setAdjustReason] = useState("")
  const [savingAdjust, setSavingAdjust] = useState(false)

  // Reject proof form
  const [rejectTargetProofId, setRejectTargetProofId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejecting, setRejecting] = useState(false)

  // Batch proof selection
  const [selectedProofIds, setSelectedProofIds] = useState<string[]>([])
  const [batchApproving, setBatchApproving] = useState(false)

  // Alert message
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const loadCollections = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.collections.list()
      setCollections(res.data.collections)
      if (res.data.collections.length > 0 && !selectedColId) {
        setSelectedColId(res.data.collections[0].id)
      }
    } catch (err: any) {
      if (!silent) showMsg(err.message || "Lỗi tải danh sách đợt thu", "error")
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const loadDetail = async (id: string, silent = false) => {
    try {
      if (!silent) setLoadingDetail(true)
      const res = await api.collections.detail(id)
      setDetail(res.data.collection)
    } catch (err: any) {
      if (!silent) showMsg(err.message || "Lỗi tải chi tiết đợt thu", "error")
    } finally {
      if (!silent) setLoadingDetail(false)
    }
  }

  const loadProofs = async (id: string, silent = false) => {
    try {
      if (!silent) setLoadingProofs(true)
      const res = await api.collections.getProofs(id)
      setProofs(res.data.proofs)
    } catch (err: any) {
      if (!silent) showMsg(err.message || "Lỗi tải danh sách biên lai", "error")
    } finally {
      if (!silent) setLoadingProofs(false)
    }
  }

  // Tự động đồng bộ thời gian thực khi có thay đổi (Real-time SSE & Focus change)
  useRealtimeRefresh(() => {
    loadCollections(true)
    if (selectedColId) {
      loadDetail(selectedColId, true)
      if (isTreasurer) {
        loadProofs(selectedColId, true)
      }
    }
  })

  useEffect(() => {
    loadCollections()
  }, [])

  useEffect(() => {
    if (selectedColId) {
      loadDetail(selectedColId)
      if (isTreasurer) {
        loadProofs(selectedColId)
      }
    }
  }, [selectedColId, isTreasurer])

  // Tải danh sách thành viên ACTIVE của lớp để chọn đợt thu
  const fetchActiveMembers = async () => {
    setLoadingMembers(true)
    try {
      const res = await api.members.list({ status: "ACTIVE", limit: 200 })
      const items = res.data?.items || []
      setActiveMembers(items)
      // Mặc định chọn cả lớp
      setSelectedTargetIds(items.map((m: any) => m.id))
    } catch (err: any) {
      showMsg(err.message || "Không thể tải danh sách thành viên", "error")
    } finally {
      setLoadingMembers(false)
    }
  }

  // Mở modal tạo đợt thu và tải danh sách thành viên để chọn
  const handleOpenCreateModal = () => {
    setShowCreateModal(true)
    setMemberSearchQuery("")
    fetchActiveMembers()
  }

  // Tạo đợt thu
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedTargetIds.length === 0) {
      showMsg("Vui lòng chọn ít nhất 1 thành viên tham gia đợt thu.", "error")
      return
    }
    setCreating(true)
    try {
      await api.collections.create({
        name: colName,
        defaultAmount: colAmount,
        dueDate: colDueDate ? new Date(colDueDate).toISOString() : null,
        description: colDesc,
        targetMemberIds: selectedTargetIds,
      })
      showMsg("Tạo đợt thu quỹ mới thành công!")
      setShowCreateModal(false)
      setColName("")
      setColDesc("")
      await loadCollections()
    } catch (err: any) {
      showMsg(err.message || "Lỗi tạo đợt thu", "error")
    } finally {
      setCreating(false)
    }
  }

  // Mở mã VietQR
  const handleOpenQr = async (customAmt?: string) => {
    if (!selectedColId) return
    try {
      const res = await api.collections.getQr(selectedColId, {
        customAmount: customAmt || customQrAmount || undefined,
      })
      setQrData(res.data)
      setShowQrModal(true)
    } catch (err: any) {
      showMsg(err.message || "Lỗi lấy thông tin VietQR", "error")
    }
  }

  // Nộp bill
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proofFile || !selectedColId) {
      showMsg("Vui lòng chọn file ảnh bill chuyển khoản", "error")
      return
    }

    setSubmittingProof(true)
    try {
      // 1. Upload file
      const upRes = await api.storage.upload(proofFile, "PAYMENT_PROOF")
      const fileId = upRes.data.fileId

      // 2. Submit proof
      const idemKey = `proof_${selectedColId}_${Date.now()}`
      await api.collections.submitProof(selectedColId, {
        amount: proofAmount,
        fileId,
        transferCode: proofCode,
        note: proofNote,
        idempotencyKey: idemKey,
      })

      showMsg("Nộp biên lai chuyển khoản thành công! Vui lòng chờ Thủ quỹ duyệt.")
      setShowProofModal(false)
      setProofFile(null)
      setProofAmount("")
      setProofCode("")
      setProofNote("")
      await loadDetail(selectedColId)
      if (isTreasurer) await loadProofs(selectedColId)
    } catch (err: any) {
      showMsg(err.message || "Lỗi nộp biên lai", "error")
    } finally {
      setSubmittingProof(false)
    }
  }

  // Thu tiền mặt
  const handleRecordCash = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedColId || !cashTargetMember) return

    setRecordingCash(true)
    try {
      const idemKey = `cash_${selectedColId}_${cashTargetMember.classMemberId}_${Date.now()}`
      await api.collections.recordCash(selectedColId, {
        classMemberId: cashTargetMember.classMemberId,
        amount: cashAmount,
        note: cashNote,
        idempotencyKey: idemKey,
      })

      showMsg(`Đã ghi nhận thu tiền mặt ${formatVnd(cashAmount)} thành công!`)
      setShowCashModal(false)
      setCashAmount("")
      setCashNote("")
      await loadDetail(selectedColId)
    } catch (err: any) {
      showMsg(err.message || "Lỗi ghi nhận tiền mặt", "error")
    } finally {
      setRecordingCash(false)
    }
  }

  // Điều chỉnh nghĩa vụ / Miễn giảm
  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedColId || !adjustMember) return

    setSavingAdjust(true)
    try {
      await api.collections.adjustObligation(selectedColId, adjustMember.obligationId, {
        targetAmount: adjustTarget,
        discountReason: adjustReason,
      })

      showMsg("Cập nhật nghĩa vụ đóng tiền thành công!")
      setShowAdjustModal(false)
      await loadDetail(selectedColId)
    } catch (err: any) {
      showMsg(err.message || "Lỗi điều chỉnh nghĩa vụ", "error")
    } finally {
      setSavingAdjust(false)
    }
  }

  // Duyệt bill đơn lẻ
  const handleApproveProof = async (proofId: string) => {
    try {
      await api.collections.approveProof(proofId)
      showMsg("Duyệt biên lai chuyển khoản thành công!")
      if (selectedColId) {
        await loadDetail(selectedColId)
        await loadProofs(selectedColId)
      }
    } catch (err: any) {
      showMsg(err.message || "Lỗi duyệt biên lai", "error")
    }
  }

  // Duyệt bill hàng loạt
  const handleBatchApprove = async () => {
    if (selectedProofIds.length === 0) return
    setBatchApproving(true)
    try {
      const res = await api.collections.batchApproveProofs(selectedProofIds)
      showMsg(`Đã duyệt thành công ${res.data.successCount}/${res.data.total} biên lai!`)
      setSelectedProofIds([])
      if (selectedColId) {
        await loadDetail(selectedColId)
        await loadProofs(selectedColId)
      }
    } catch (err: any) {
      showMsg(err.message || "Lỗi duyệt hàng loạt", "error")
    } finally {
      setBatchApproving(false)
    }
  }

  // Từ chối bill
  const handleRejectProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectTargetProofId) return

    setRejecting(true)
    try {
      await api.collections.rejectProof(rejectTargetProofId, rejectReason)
      showMsg("Đã từ chối biên lai chuyển khoản!")
      setShowRejectModal(false)
      setRejectReason("")
      if (selectedColId) {
        await loadDetail(selectedColId)
        await loadProofs(selectedColId)
      }
    } catch (err: any) {
      showMsg(err.message || "Lỗi từ chối biên lai", "error")
    } finally {
      setRejecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Quản lý đóng quỹ"
          desc="Theo dõi các đợt thu, đóng quỹ bằng VietQR Napas247, nộp biên lai và ghi nhận tiền mặt."
        />
        {isTreasurer && (
          <Button
            variant="primary"
            onClick={handleOpenCreateModal}
            className="self-start sm:self-auto"
          >
            <Icon name="plus-circle" size={18} />
            Tạo đợt thu mới
          </Button>
        )}
      </div>

      {/* Thông báo Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-subtle hover:text-ink">
            ✕
          </button>
        </div>
      )}

      {/* DANH SÁCH CÁC ĐỢT THU (CARD NGANG) */}
      {loading ? (
        <p className="text-subtle text-sm">Đang tải danh sách đợt thu...</p>
      ) : collections.length === 0 ? (
        <Card className="p-8 text-center">
          <Icon name="wallet" size={40} className="mx-auto text-subtle mb-3" />
          <h3 className="font-bold text-base text-ink">Chưa có đợt thu quỹ nào</h3>
          <p className="text-xs text-subtle mt-1">
            {isTreasurer
              ? "Bấm 'Tạo đợt thu mới' ở trên để bắt đầu phát động đợt đóng quỹ cho lớp."
              : "Thủ quỹ chưa tạo đợt thu quỹ nào trong kỳ này."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => {
            const isSelected = col.id === selectedColId
            return (
              <div
                key={col.id}
                onClick={() => setSelectedColId(col.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? "border-brand bg-tint/40 shadow-sm ring-2 ring-brand/20"
                    : "border-border bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-ink">{col.name}</span>
                  <Badge tone={col.status === "OPEN" ? "success" : "neutral"}>
                    {col.status === "OPEN" ? "Đang mở" : "Đã đóng"}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-subtle space-y-1">
                  <p>Mức thu chuẩn: <b className="text-ink">{formatVnd(col.defaultAmount)}</b>/bạn</p>
                  {col.dueDate && (
                    <p>Hạn đóng: <b className="text-ink">{new Date(col.dueDate).toLocaleDateString("vi-VN")}</b></p>
                  )}
                </div>

                {col.stats && (
                  <div className="mt-3 pt-3 border-t border-border/60">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-subtle">Tiến độ thu:</span>
                      <span className="font-bold text-ink">
                        {formatVnd(col.stats.collectedTotal)} / {formatVnd(col.stats.targetTotal)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${
                            BigInt(col.stats.targetTotal || 0) > 0n
                              ? Math.min(
                                  100,
                                  Number(
                                    (BigInt(col.stats.collectedTotal || 0) * 100n) /
                                      BigInt(col.stats.targetTotal || 1),
                                  ),
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CHI TIẾT ĐỢT THU ĐƯỢC CHỌN (THAO TÁC TẠI CHỖ) */}
      {selectedColId && (
        <Card className="p-6">
          {loadingDetail ? (
            <p className="text-subtle text-sm">Đang tải chi tiết đợt thu...</p>
          ) : !detail ? (
            <p className="text-subtle text-sm">Không tìm thấy thông tin chi tiết.</p>
          ) : (
            <div className="space-y-6">
              {/* Header chi tiết */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-ink">{detail.name}</h2>
                    <Badge tone={detail.status === "OPEN" ? "success" : "neutral"}>
                      {detail.status === "OPEN" ? "Đang mở" : "Đã chốt"}
                    </Badge>
                  </div>
                  <p className="text-xs text-subtle mt-1">
                    Mức đóng chuẩn: <b>{formatVnd(detail.defaultAmount)}</b>
                    {detail.dueDate && ` • Hạn nộp: ${new Date(detail.dueDate).toLocaleDateString("vi-VN")}`}
                  </p>
                </div>

                {/* Nút hành động */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    className="bg-brand text-white hover:bg-brand/90"
                    onClick={() => handleOpenQr()}
                  >
                    <Icon name="qr-code" size={18} />
                    Lấy mã VietQR
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const myOb = detail.members?.find(
                        (m: any) => m.classMemberId === activeMembership?.id,
                      )
                      setProofAmount(myOb?.remainingAmount || detail.defaultAmount)
                      setShowProofModal(true)
                    }}
                  >
                    <Icon name="upload" size={18} />
                    Nộp bill chuyển khoản
                  </Button>
                </div>
              </div>

              {/* Sub-tabs cho Thủ quỹ */}
              {isTreasurer && (
                <div className="flex border-b border-border gap-4 text-sm font-semibold">
                  <button
                    onClick={() => setActiveTab("members")}
                    className={`pb-2.5 transition-colors border-b-2 ${
                      activeTab === "members"
                        ? "border-brand text-brand"
                        : "border-transparent text-subtle hover:text-ink"
                    }`}
                  >
                    Danh sách đóng tiền ({detail.members?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab("proofs")}
                    className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                      activeTab === "proofs"
                        ? "border-brand text-brand"
                        : "border-transparent text-subtle hover:text-ink"
                    }`}
                  >
                    Biên lai chuyển khoản
                    {proofs.filter((p) => p.status === "PENDING").length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                        {proofs.filter((p) => p.status === "PENDING").length}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 1: DANH SÁCH THÀNH VIÊN VÀ TIẾN ĐỘ ĐÓNG */}
              {(!isTreasurer || activeTab === "members") && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase text-subtle">
                        <th className="py-2.5 px-3">Thành viên</th>
                        <th className="py-2.5 px-3">Phải nộp</th>
                        <th className="py-2.5 px-3">Đã nhận</th>
                        <th className="py-2.5 px-3">Còn thiếu</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                        {isTreasurer && <th className="py-2.5 px-3 text-right">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.members?.map((m: any) => {
                        const isPaid = m.status === "PAID"
                        const isPartial = m.status === "PARTIAL"
                        const isExempt = m.status === "EXEMPT"

                        return (
                          <tr key={m.obligationId} className="hover:bg-slate-50/60">
                            <td className="py-3 px-3">
                              <p className="font-semibold text-ink">{m.displayName}</p>
                              <p className="text-xs text-subtle">{m.memberCode} • {m.email}</p>
                              {m.discountReason && (
                                <p className="text-[11px] text-amber-700 mt-0.5">
                                  Lý do điều chỉnh: {m.discountReason}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-3 font-medium text-ink">
                              {formatVnd(m.targetAmount)}
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-600">
                              {formatVnd(m.paidAmount)}
                            </td>
                            <td className="py-3 px-3">
                              {BigInt(m.remainingAmount) > 0n ? (
                                <span className="font-bold text-rose-600">
                                  {formatVnd(m.remainingAmount)}
                                </span>
                              ) : (
                                <span className="text-subtle font-medium">—</span>
                              )}
                              {BigInt(m.overpaidAmount) > 0n && (
                                <span className="block text-[11px] font-bold text-blue-600">
                                  Dư: {formatVnd(m.overpaidAmount)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <Badge
                                tone={
                                  isPaid
                                    ? "success"
                                    : isPartial
                                    ? "warn"
                                    : isExempt
                                    ? "neutral"
                                    : "danger"
                                }
                              >
                                {isPaid
                                  ? "Đã đóng đủ"
                                  : isPartial
                                  ? "Đóng 1 phần"
                                  : isExempt
                                  ? "Miễn đóng"
                                  : "Chưa đóng"}
                              </Badge>
                            </td>

                            {isTreasurer && (
                              <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="text-xs"
                                  onClick={() => {
                                    setCashTargetMember(m)
                                    setCashAmount(m.remainingAmount || detail.defaultAmount)
                                    setShowCashModal(true)
                                  }}
                                >
                                  Thu tiền mặt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs text-subtle hover:text-ink"
                                  onClick={() => {
                                    setAdjustMember(m)
                                    setAdjustTarget(m.targetAmount)
                                    setAdjustReason(m.discountReason || "")
                                    setShowAdjustModal(true)
                                  }}
                                >
                                  Sửa/Miễn
                                </Button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: DUYỆT BIÊN LAI CHUYỂN KHOẢN (THỦ QUỸ) */}
              {isTreasurer && activeTab === "proofs" && (
                <div className="space-y-4">
                  {/* Action bar duyệt hàng loạt */}
                  {selectedProofIds.length > 0 && (
                    <div className="p-3 bg-tint/80 rounded-xl flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink">
                        Đã chọn {selectedProofIds.length} biên lai
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleBatchApprove}
                        disabled={batchApproving}
                      >
                        {batchApproving ? "Đang duyệt..." : "Duyệt tất cả đã chọn"}
                      </Button>
                    </div>
                  )}

                  {loadingProofs ? (
                    <p className="text-subtle text-sm">Đang tải danh sách biên lai...</p>
                  ) : proofs.length === 0 ? (
                    <p className="text-subtle text-sm py-6 text-center">
                      Chưa có biên lai chuyển khoản nào được nộp trong đợt thu này.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs uppercase text-subtle">
                            <th className="py-2.5 px-3 w-8">
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  const pendingIds = proofs
                                    .filter((p) => p.status === "PENDING")
                                    .map((p) => p.id)
                                  if (e.target.checked) setSelectedProofIds(pendingIds)
                                  else setSelectedProofIds([])
                                }}
                                checked={
                                  selectedProofIds.length > 0 &&
                                  selectedProofIds.length ===
                                    proofs.filter((p) => p.status === "PENDING").length
                                }
                              />
                            </th>
                            <th className="py-2.5 px-3">Người nộp</th>
                            <th className="py-2.5 px-3">Số tiền</th>
                            <th className="py-2.5 px-3">Ảnh bill</th>
                            <th className="py-2.5 px-3">Trạng thái</th>
                            <th className="py-2.5 px-3 text-right">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {proofs.map((p) => {
                            const isPending = p.status === "PENDING"
                            const isApproved = p.status === "APPROVED"

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/60">
                                <td className="py-3 px-3">
                                  {isPending && (
                                    <input
                                      type="checkbox"
                                      checked={selectedProofIds.includes(p.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedProofIds([...selectedProofIds, p.id])
                                        } else {
                                          setSelectedProofIds(
                                            selectedProofIds.filter((id) => id !== p.id),
                                          )
                                        }
                                      }}
                                    />
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <p className="font-semibold text-ink">{p.displayName}</p>
                                  <p className="text-xs text-subtle">{p.memberCode}</p>
                                  <p className="text-[11px] text-subtle">
                                    {new Date(p.createdAt).toLocaleString("vi-VN")}
                                  </p>
                                  {p.transferCode && (
                                    <p className="text-xs text-brand font-mono mt-0.5">
                                      Nội dung: {p.transferCode}
                                    </p>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-bold text-ink">
                                  {formatVnd(p.amount)}
                                </td>
                                <td className="py-3 px-3">
                                  {p.file?.id ? (
                                    <button
                                      type="button"
                                      onClick={() => setShowImageViewModal(api.storage.getFileUrl(p.file.id))}
                                      className="group relative inline-flex items-center gap-1.5 text-xs text-brand font-semibold hover:underline"
                                    >
                                      <Icon name="image" size={16} />
                                      Xem ảnh bill
                                    </button>
                                  ) : (
                                    <span className="text-subtle text-xs">Không có file</span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <Badge
                                    tone={
                                      isApproved
                                        ? "success"
                                        : isPending
                                        ? "warn"
                                        : "danger"
                                    }
                                  >
                                    {isApproved
                                      ? "Đã duyệt"
                                      : isPending
                                      ? "Chờ duyệt"
                                      : "Bị từ chối"}
                                  </Badge>
                                  {p.rejectReason && (
                                    <p className="text-[11px] text-rose-600 mt-0.5">
                                      Lý do: {p.rejectReason}
                                    </p>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                                  {isPending && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => handleApproveProof(p.id)}
                                      >
                                        Duyệt
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="danger"
                                        className="text-xs"
                                        onClick={() => {
                                          setRejectTargetProofId(p.id)
                                          setShowRejectModal(true)
                                        }}
                                      >
                                        Từ chối
                                      </Button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* MODAL 1: TẠO ĐỢT THU MỚI (THỦ QUỸ) */}
      {showCreateModal && (
        <Modal
          onClose={() => setShowCreateModal(false)}
          title="Tạo đợt thu quỹ mới"
          size="lg"
        >
          <form onSubmit={handleCreateCollection} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Tên đợt thu</label>
              <Input
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                placeholder="VD: Quỹ hoạt động Tháng 10, Tiền photo tài liệu..."
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Mức thu tiêu chuẩn mỗi bạn (VND)
                </label>
                <Input
                  type="number"
                  min="1000"
                  step="1000"
                  value={colAmount}
                  onChange={(e) => setColAmount(e.target.value)}
                  placeholder="50000"
                  required
                />
                <p className="text-[11px] text-subtle mt-1">
                  Bằng chữ: <b>{formatVnd(colAmount)}</b>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Hạn nộp (tùy chọn)</label>
                <Input
                  type="date"
                  value={colDueDate}
                  onChange={(e) => setColDueDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Ghi chú / Mục đích thu</label>
              <textarea
                value={colDesc}
                onChange={(e) => setColDesc(e.target.value)}
                placeholder="Mô tả chi tiết mục đích sử dụng quỹ..."
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                rows={2}
              />
            </div>

            {/* CHỌN THÀNH VIÊN THAM GIA ĐỢT THU */}
            <div className="border border-border rounded-xl p-3 bg-slate-50 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-ink">
                    Thành viên tham gia đợt thu ({selectedTargetIds.length}/{activeMembers.length} bạn)
                  </label>
                  <p className="text-[11px] text-subtle">
                    Tổng phải thu dự kiến: <b className="text-brand">{formatVnd(BigInt(colAmount || 0) * BigInt(selectedTargetIds.length))}</b>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="text-xs h-7 px-2"
                    disabled={loadingMembers || activeMembers.length === 0}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSelectedTargetIds(activeMembers.map((m: any) => m.id))
                    }}
                  >
                    Chọn cả lớp
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 px-2"
                    disabled={loadingMembers || selectedTargetIds.length === 0}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSelectedTargetIds([])
                    }}
                  >
                    Bỏ chọn hết
                  </Button>
                </div>
              </div>

              {/* Tìm kiếm thành viên */}
              <Input
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên hoặc MSSV..."
                className="text-xs bg-white"
              />

              {/* Danh sách thành viên chọn lẻ */}
              <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-lg border border-border bg-white">
                {loadingMembers ? (
                  <p className="p-3 text-xs text-subtle text-center">Đang tải danh sách thành viên...</p>
                ) : activeMembers.length === 0 ? (
                  <div className="p-3 text-xs text-subtle text-center space-y-1">
                    <p>Không có thành viên chính thức nào.</p>
                    <button
                      type="button"
                      onClick={() => fetchActiveMembers()}
                      className="text-brand hover:underline font-semibold"
                    >
                      Tải lại danh sách
                    </button>
                  </div>
                ) : (
                  activeMembers
                    .filter(
                      (m) =>
                        m.displayName?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                        (m.memberCode || "").toLowerCase().includes(memberSearchQuery.toLowerCase()),
                    )
                    .map((m) => {
                      const isChecked = selectedTargetIds.includes(m.id)
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center justify-between p-2 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                            isChecked ? "bg-brand/5" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTargetIds((prev) => [...prev, m.id])
                                } else {
                                  setSelectedTargetIds((prev) => prev.filter((id) => id !== m.id))
                                }
                              }}
                              className="rounded border-border text-brand focus:ring-brand size-3.5 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-ink">{m.displayName}</span>
                              {m.memberCode ? (
                                <span className="ml-1.5 font-mono text-subtle text-[11px]">({m.memberCode})</span>
                              ) : null}
                            </div>
                          </div>
                          <Badge tone={m.role === "TREASURER" ? "warn" : "neutral"} className="text-[10px]">
                            {m.role === "TREASURER" ? "Thủ quỹ" : "Thành viên"}
                          </Badge>
                        </label>
                      )
                    })
                )}
              </div>

              {selectedTargetIds.length === 0 && (
                <p className="text-[11px] font-semibold text-rose-600">
                  ⚠️ Chưa chọn ai. Vui lòng chọn ít nhất 1 thành viên để tạo đợt thu.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={creating || selectedTargetIds.length === 0}
              >
                {creating
                  ? "Đang tạo..."
                  : `Xác nhận tạo đợt thu (${selectedTargetIds.length} bạn)`}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: HIỂN THỊ VIETQR NAPAS247 */}
      {showQrModal && (
        <Modal
          onClose={() => setShowQrModal(false)}
          title="Quét mã VietQR chuyển khoản đóng quỹ"
        >
          <div className="space-y-4 text-center">
            {!qrData?.hasBankConfig ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                <Icon name="alert-circle" size={28} className="mx-auto text-amber-600 mb-2" />
                <p className="font-bold">Lớp chưa cấu hình tài khoản ngân hàng nhận tiền</p>
                <p className="text-xs text-amber-700 mt-1">
                  Vui lòng liên hệ Thủ quỹ của lớp để thiết lập số tài khoản ngân hàng, hoặc trực tiếp nộp tiền mặt.
                </p>
              </div>
            ) : (
              <>
                {/* Ảnh VietQR Napas247 */}
                <div className="mx-auto w-64 h-64 border rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-2 shadow-sm">
                  <img
                    src={qrData.qrImageUrl}
                    alt="VietQR Napas247"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Thông tin chuyển khoản */}
                <div className="bg-slate-50 p-3 rounded-xl text-left text-xs space-y-1.5 border border-border">
                  <div className="flex justify-between">
                    <span className="text-subtle">Ngân hàng:</span>
                    <span className="font-bold text-ink">{qrData.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-subtle">Số tài khoản:</span>
                    <span className="font-mono font-bold text-brand">{qrData.bankAccountNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-subtle">Chủ tài khoản:</span>
                    <span className="font-bold text-ink uppercase">{qrData.bankAccountHolder}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-subtle">Số tiền:</span>
                    <span className="font-extrabold text-emerald-600 text-sm">{formatVnd(qrData.amount)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="text-subtle">Nội dung CK:</span>
                    <span className="font-mono font-bold text-rose-600">{qrData.transferContent}</span>
                  </div>
                </div>

                {/* Tùy chỉnh đóng từng phần */}
                <div className="text-left pt-1">
                  <label className="block text-xs font-semibold text-subtle mb-1">
                    Đóng từng phần (nhập số tiền muốn chuyển nếu không đóng hết):
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="10000"
                      step="5000"
                      value={customQrAmount}
                      onChange={(e) => setCustomQrAmount(e.target.value)}
                      placeholder={qrData.remainingAmount}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenQr(customQrAmount)}
                    >
                      Đổi tiền QR
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-subtle italic">
                  Sau khi chuyển khoản thành công, hãy chụp màn hình lại và bấm <b>"Nộp bill xác nhận"</b> để Thủ quỹ duyệt tiền vào quỹ lớp.
                </p>
              </>
            )}

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" onClick={() => setShowQrModal(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: NỘP BIÊN LAI CHUYỂN KHOẢN (BILL) */}
      {showProofModal && (
        <Modal
          onClose={() => setShowProofModal(false)}
          title="Nộp biên lai chuyển khoản (Bill)"
        >
          <form onSubmit={handleSubmitProof} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Số tiền bạn đã chuyển (VND)
              </label>
              <Input
                type="number"
                min="1000"
                step="1000"
                value={proofAmount}
                onChange={(e) => setProofAmount(e.target.value)}
                placeholder="50000"
                required
              />
              <p className="text-[11px] text-subtle mt-1">
                Bằng chữ: <b>{formatVnd(proofAmount)}</b>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Biên lai chuyển khoản (JPG, PNG, WEBP hoặc PDF &lt;= 5MB)
              </label>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp, application/pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-ink file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-tint file:text-ink hover:file:bg-brand/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Nội dung chuyển khoản hoặc mã giao dịch ngân hàng
              </label>
              <Input
                value={proofCode}
                onChange={(e) => setProofCode(e.target.value)}
                placeholder="VD: CF CNTT-K15 20210001..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Ghi chú (tùy chọn)</label>
              <Input
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                placeholder="Lời nhắn thêm..."
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowProofModal(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" disabled={submittingProof}>
                {submittingProof ? "Đang tải lên..." : "Xác nhận nộp bill"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: THỦ QUỸ GHI NHẬN TIỀN MẶT */}
      {showCashModal && (
        <Modal
          onClose={() => setShowCashModal(false)}
          title="Ghi nhận thu tiền mặt trực tiếp"
        >
          <form onSubmit={handleRecordCash} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p>Thành viên: <b className="text-ink">{cashTargetMember?.displayName}</b> ({cashTargetMember?.memberCode})</p>
              <p>Khoản còn thiếu: <b className="text-rose-600">{formatVnd(cashTargetMember?.remainingAmount)}</b></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Số tiền mặt thực thu (VND)
              </label>
              <Input
                type="number"
                min="1000"
                step="1000"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                required
              />
              <p className="text-[11px] text-subtle mt-1">
                Bằng chữ: <b>{formatVnd(cashAmount)}</b>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Ghi chú thu tiền</label>
              <Input
                value={cashNote}
                onChange={(e) => setCashNote(e.target.value)}
                placeholder="VD: Thu trực tiếp tại lớp học..."
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowCashModal(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" disabled={recordingCash}>
                {recordingCash ? "Đang ghi nhận..." : "Ghi nhận vào Quỹ Tiền mặt"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 5: ĐIỀU CHỈNH NGHĨA VỤ / MIỄN GIẢM */}
      {showAdjustModal && (
        <Modal
          onClose={() => setShowAdjustModal(false)}
          title="Điều chỉnh nghĩa vụ / Miễn giảm"
        >
          <form onSubmit={handleSaveAdjust} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p>Thành viên: <b className="text-ink">{adjustMember?.displayName}</b> ({adjustMember?.memberCode})</p>
              <p>Mức thu chuẩn ban đầu: <b>{formatVnd(detail?.defaultAmount)}</b></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Mức đóng mục tiêu mới (Nhập 0 nếu miễn đóng hoàn toàn)
              </label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={adjustTarget}
                onChange={(e) => setAdjustTarget(e.target.value)}
                required
              />
              <p className="text-[11px] text-subtle mt-1">
                {adjustTarget === "0" ? "Miễn đóng 100% (EXEMPT)" : `Mục tiêu mới: ${formatVnd(adjustTarget)}`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Lý do điều chỉnh / miễn giảm (Bắt buộc để lưu vết Audit)
              </label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="VD: Gia đình khó khăn, Ban cán sự lớp, Học bổng..."
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowAdjustModal(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" disabled={savingAdjust}>
                {savingAdjust ? "Đang lưu..." : "Xác nhận điều chỉnh"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 6: TỪ CHỐI BILL CHUYỂN KHOẢN */}
      {showRejectModal && (
        <Modal
          onClose={() => setShowRejectModal(false)}
          title="Từ chối bằng chứng chuyển khoản"
        >
          <form onSubmit={handleRejectProof} className="space-y-4">
            <p className="text-xs text-subtle">
              Vui lòng nhập lý do từ chối để thành viên có thể kiểm tra lại số tiền hoặc gửi lại biên lai chính xác.
            </p>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Lý do từ chối</label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Không tìm thấy giao dịch trên sao kê, Sai số tiền..."
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowRejectModal(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="danger" disabled={rejecting}>
                {rejecting ? "Đang từ chối..." : "Xác nhận từ chối"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 7: XEM ẢNH BILL PHÓNG TO */}
      {showImageViewModal && (
        <Modal
          onClose={() => setShowImageViewModal(null)}
          title="Chi tiết ảnh bằng chứng chuyển khoản"
        >
          <div className="space-y-4 text-center">
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-border bg-slate-50 p-2">
              <img
                src={showImageViewModal}
                alt="Bill chuyển khoản"
                className="max-h-full max-w-full mx-auto object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setShowImageViewModal(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function CollectionDetail({ id: _id }: { id: string }) {
  return <Collections />
}
