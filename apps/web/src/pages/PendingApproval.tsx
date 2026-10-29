import { api } from "../lib/api"
import { useStore } from "../lib/store"
import { Button, Icon, useBusy, useToast } from "../components/ui"

export default function PendingApproval() {
  const { activeMembership, activeClass, isRejected, refreshUser, logout } = useStore()
  const toast = useToast()
  const { busy, run } = useBusy()

  const handleReapply = () => {
    if (!activeClass) return
    run(async () => {
      try {
        await api.classes.reapply(activeClass.id)
        toast("success", "Đã gửi lại yêu cầu tham gia. Vui lòng chờ Thủ quỹ phê duyệt.")
        await refreshUser()
      } catch (err: any) {
        toast("error", err.message)
      }
    })
  }

  const handleCancelRequest = () => {
    if (!activeClass) return
    run(async () => {
      try {
        await api.classes.cancelRequest(activeClass.id)
        toast("info", "Đã hủy yêu cầu tham gia lớp. Bạn có thể chọn lớp khác.")
        await refreshUser()
      } catch (err: any) {
        toast("error", err.message)
      }
    })
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-sand/30 p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-sand bg-white p-6 text-center shadow-sm sm:p-8">
        <div
          className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${
            isRejected ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
          }`}
        >
          <Icon name={isRejected ? "x" : "clock"} size={28} />
        </div>

        <h2 className="text-xl font-bold text-ink">
          {isRejected ? "Yêu cầu tham gia bị từ chối" : "Đang chờ Thủ quỹ phê duyệt"}
        </h2>

        <p className="mt-2 text-sm text-ink-muted">
          {isRejected ? (
            <>
              Yêu cầu tham gia lớp <b className="text-ink">{activeClass?.name}</b> của bạn đã bị từ chối.
            </>
          ) : (
            <>
              Bạn đã gửi yêu cầu tham gia lớp <b className="text-ink">{activeClass?.name}</b> với mã số{" "}
              <b>{activeMembership?.memberCode}</b>.
            </>
          )}
        </p>

        <p className="mt-4 rounded-lg bg-sand/30 p-3 text-xs text-ink-muted leading-relaxed">
          {isRejected
            ? "Bạn có thể gửi lại yêu cầu xin xét duyệt lại hoặc hủy để tham gia lớp khác."
            : "Để bảo đảm an toàn dữ liệu tài chính, chỉ thành viên được Thủ quỹ phê duyệt mới có thể xem thông tin thu chi của lớp."}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {isRejected ? (
            <>
              <Button variant="primary" onClick={handleReapply} loading={busy} className="w-full">
                Gửi lại yêu cầu tham gia
              </Button>
              <Button variant="secondary" onClick={handleCancelRequest} disabled={busy} className="w-full">
                Hủy và chọn lớp khác
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" onClick={() => refreshUser()} loading={busy} className="w-full">
                Kiểm tra lại trạng thái duyệt
              </Button>
              <Button variant="ghost" onClick={handleCancelRequest} disabled={busy} className="w-full text-xs text-red-600">
                Hủy yêu cầu tham gia lớp này
              </Button>
            </>
          )}

          <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={logout} className="text-ink-muted">
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
