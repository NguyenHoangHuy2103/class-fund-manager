import { useState } from "react"
import { api } from "../lib/api"
import { useStore } from "../lib/store"
import { Button, Field, Icon, Input, useBusy, useToast } from "../components/ui"

export default function ClassOnboarding() {
  const { user, refreshUser, logout } = useStore()
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose")
  const toast = useToast()
  const { busy, run } = useBusy()

  // Form Tạo lớp
  const [createCode, setCreateCode] = useState("")
  const [createName, setCreateName] = useState("")
  const [createMemberCode, setCreateMemberCode] = useState("")
  const [createDisplayName, setCreateDisplayName] = useState(user?.fullName || "")
  const [createError, setCreateError] = useState<string | null>(null)

  // Form Tham gia lớp
  const [joinInviteCode, setJoinInviteCode] = useState("")
  const [joinMemberCode, setJoinMemberCode] = useState("")
  const [joinDisplayName, setJoinDisplayName] = useState(user?.fullName || "")
  const [joinError, setJoinError] = useState<string | null>(null)

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    if (!createCode.trim() || !createName.trim() || !createMemberCode.trim()) {
      return setCreateError("Vui lòng điền đầy đủ các thông tin bắt buộc.")
    }

    run(async () => {
      try {
        await api.classes.create({
          code: createCode.trim().toUpperCase(),
          name: createName.trim(),
          memberCode: createMemberCode.trim(),
          displayName: createDisplayName.trim(),
        })
        toast("success", "Đã khởi tạo lớp và kỳ 1 thành công.")
        await refreshUser()
      } catch (err: any) {
        setCreateError(err.message || "Không thể tạo lớp học. Vui lòng thử lại.")
      }
    })
  }

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault()
    setJoinError(null)

    if (!joinInviteCode.trim() || !joinMemberCode.trim()) {
      return setJoinError("Vui lòng nhập mã mời và MSSV/mã số của bạn.")
    }

    run(async () => {
      try {
        await api.classes.join({
          inviteCode: joinInviteCode.trim().toUpperCase(),
          memberCode: joinMemberCode.trim(),
          displayName: joinDisplayName.trim(),
        })
        toast("success", "Yêu cầu tham gia lớp đang chờ thủ quỹ phê duyệt.")
        await refreshUser()
      } catch (err: any) {
        setJoinError(err.message || "Không thể tham gia lớp học. Vui lòng kiểm tra lại mã mời.")
      }
    })
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-sand/30 p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-2xl border border-sand bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-sand/60 pb-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Chào mừng, {user?.fullName}!</h2>
            <p className="text-sm text-ink-muted">Bạn chưa tham gia lớp học nào trên hệ thống.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            Đăng xuất
          </Button>
        </div>

        {mode === "choose" && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-ink">Vui lòng chọn cách tiếp tục:</p>

            <button
              type="button"
              onClick={() => setMode("create")}
              className="flex w-full items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left transition hover:border-primary/50 hover:bg-primary/10"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                <Icon name="plus" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-ink">Tạo lớp mới (Làm Thủ quỹ)</h3>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">
                  Dành cho bạn đại diện lớp, thủ quỹ. Bạn sẽ khởi tạo mã lớp, thiết lập kỳ thu chi đầu tiên và nhận mã mời lớp.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode("join")}
              className="flex w-full items-start gap-4 rounded-xl border border-sand bg-sand/20 p-4 text-left transition hover:border-ink-muted/30 hover:bg-sand/40"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
                <Icon name="users" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-ink">Tham gia lớp học (Thành viên)</h3>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">
                  Nhập mã mời do Thủ quỹ lớp của bạn cung cấp (gồm 6 ký tự) để gửi yêu cầu tham gia lớp.
                </p>
              </div>
            </button>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreateClass} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink">Khởi tạo lớp học mới</h3>
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="text-xs text-ink-muted hover:underline"
              >
                ← Quay lại
              </button>
            </div>

            {createError && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {createError}
              </div>
            )}

            <Field label="Mã lớp (VD: CNTT-K15, SE1902)" required>
              {(p) => (
                <Input
                  {...p}
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                  placeholder="CNTT-K15"
                  disabled={busy}
                />
              )}
            </Field>

            <Field label="Tên lớp đầy đủ" required>
              {(p) => (
                <Input
                  {...p}
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Lớp Công Nghệ Thông Tin K15"
                  disabled={busy}
                />
              )}
            </Field>

            <Field label="Mã số sinh viên (MSSV) của bạn" required>
              {(p) => (
                <Input
                  {...p}
                  value={createMemberCode}
                  onChange={(e) => setCreateMemberCode(e.target.value)}
                  placeholder="SE190201"
                  disabled={busy}
                />
              )}
            </Field>

            <Field label="Tên hiển thị trong lớp" required>
              {(p) => (
                <Input
                  {...p}
                  value={createDisplayName}
                  onChange={(e) => setCreateDisplayName(e.target.value)}
                  placeholder="Nguyễn Văn A (Thủ quỹ)"
                  disabled={busy}
                />
              )}
            </Field>

            <div className="pt-2">
              <Button type="submit" variant="primary" loading={busy} className="w-full">
                Tạo lớp & Bắt đầu làm Thủ quỹ
              </Button>
            </div>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoinClass} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink">Tham gia lớp học bằng mã mời</h3>
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="text-xs text-ink-muted hover:underline"
              >
                ← Quay lại
              </button>
            </div>

            {joinError && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {joinError}
              </div>
            )}

            <Field label="Mã mời lớp (6 ký tự)" required>
              {(p) => (
                <Input
                  {...p}
                  value={joinInviteCode}
                  onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                  placeholder="VD: K15DEMO"
                  disabled={busy}
                  className="text-center font-mono text-lg tracking-wider"
                />
              )}
            </Field>

            <Field label="Mã số sinh viên (MSSV)" required>
              {(p) => (
                <Input
                  {...p}
                  value={joinMemberCode}
                  onChange={(e) => setJoinMemberCode(e.target.value)}
                  placeholder="VD: SE190203"
                  disabled={busy}
                />
              )}
            </Field>

            <Field label="Họ tên của bạn" required>
              {(p) => (
                <Input
                  {...p}
                  value={joinDisplayName}
                  onChange={(e) => setJoinDisplayName(e.target.value)}
                  placeholder="Lê Hoàng Anh"
                  disabled={busy}
                />
              )}
            </Field>

            <div className="pt-2">
              <Button type="submit" variant="primary" loading={busy} className="w-full">
                Gửi yêu cầu tham gia lớp
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
