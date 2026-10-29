import { useEffect, useState } from "react"
import { api, type MemberItem } from "../lib/api"
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Empty,
  Field,
  Icon,
  Input,
  Modal,
  PageHeader,
  PageSkeleton,
  SearchBox,
  Select,
  Toolbar,
  useBusy,
  useToast,
  type Col,
} from "../components/ui"
import { useStore } from "../lib/store"

function MemberModal({
  member,
  onClose,
  onSuccess,
}: {
  member?: MemberItem | null
  onClose: () => void
  onSuccess: () => void
}) {
  const toast = useToast()
  const { busy, run } = useBusy()
  const isEditing = !!member

  const [code, setCode] = useState(member?.code || "")
  const [name, setName] = useState(member?.name || "")
  const [email, setEmail] = useState(member?.email || "")
  const [phone, setPhone] = useState(member?.phone || "")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!isEditing && code.trim().length < 2)
      return setError("Mã sinh viên ít nhất 2 ký tự")
    if (name.trim().length < 2) return setError("Họ tên ít nhất 2 ký tự")
    if (!isEditing && !email.trim())
      return setError("Email không được để trống")

    setError(null)
    run(async () => {
      try {
        if (isEditing) {
          const res = await api.members.update(member.id, {
            name: name.trim(),
            phone: phone.trim() || undefined,
          })
          toast("success", res.message)
        } else {
          const res = await api.members.create({
            code: code.trim().toUpperCase(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || undefined,
          })
          toast("success", res.message)
        }
        onSuccess()
        onClose()
      } catch (err: any) {
        setError(err.message || "Không thể lưu thông tin thành viên.")
      }
    })
  }

  return (
    <Modal
      title={isEditing ? "Sửa thông tin thành viên" : "Thêm thành viên mới"}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button variant="primary" loading={busy} onClick={handleSubmit}>
            {isEditing ? "Lưu thay đổi" : "Thêm thành viên"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="flex gap-2 rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad"
          >
            <Icon name="alert" size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mã sinh viên (Code)" required={!isEditing}>
            {(p) => (
              <Input
                {...p}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SE190201"
                disabled={busy || isEditing}
              />
            )}
          </Field>

          <Field label="Số điện thoại (Tùy chọn)">
            {(p) => (
              <Input
                {...p}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912345678"
                disabled={busy}
              />
            )}
          </Field>
        </div>

        <Field label="Họ và tên" required>
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              disabled={busy}
            />
          )}
        </Field>

        <Field label="Email" required={!isEditing}>
          {(p) => (
            <Input
              {...p}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="a.nv@lopse1902.edu.vn"
              disabled={busy || isEditing}
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}

export default function Members() {
  const { role } = useStore()
  const toast = useToast()
  const [items, setItems] = useState<MemberItem[]>([])
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalMember, setModalMember] = useState<MemberItem | null | "CREATE">(
    null,
  )
  const [togglingMember, setTogglingMember] = useState<MemberItem | null>(null)

  const loadMembers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.members.list({ status, search })
      setItems(res.data.items)
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách thành viên.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [status, search])

  const handleToggleStatus = async () => {
    if (!togglingMember) return
    const nextStatus =
      togglingMember.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      const res = await api.members.setStatus(togglingMember.id, nextStatus)
      toast("success", res.message)
      setTogglingMember(null)
      loadMembers()
    } catch (err: any) {
      return err.message || "Lỗi khi cập nhật trạng thái."
    }
  }

  const cols: Col<MemberItem>[] = [
    {
      key: "name",
      header: "Thành viên",
      title: true,
      cell: (m) => (
        <span className="flex items-center gap-3">
          <Avatar name={m.name} size={36} />
          <span>
            <span className="block font-semibold text-ink">{m.name}</span>
            <span className="block text-xs text-subtle">{m.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: "code",
      header: "Mã SV",
      cell: (m) => <span className="tnum font-bold text-ink">{m.code}</span>,
    },
    {
      key: "phone",
      header: "Số điện thoại",
      cell: (m) => (
        <span className="tnum text-sm text-subtle">{m.phone || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (m) =>
        m.status === "ACTIVE" ? (
          <Badge tone="success" icon="check">
            Đang học
          </Badge>
        ) : (
          <Badge tone="neutral" icon="logout">
            Ngừng hoạt động
          </Badge>
        ),
    },
    ...(role === "ADMIN"
      ? [
          {
            key: "action",
            header: "",
            align: "right" as const,
            noMobileLabel: true,
            cell: (m: MemberItem) => (
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon="pencil"
                  onClick={() => setModalMember(m)}
                >
                  Sửa
                </Button>
                <Button
                  size="sm"
                  variant={m.status === "ACTIVE" ? "ghost" : "soft"}
                  onClick={() => setTogglingMember(m)}
                >
                  {m.status === "ACTIVE" ? "Rời lớp" : "Khôi phục"}
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title="Quản lý thành viên lớp"
        desc="Danh sách sinh viên trong lớp, cập nhật thông tin và trạng thái hoạt động."
        actions={
          role === "ADMIN" && (
            <Button
              variant="primary"
              icon="plus"
              onClick={() => setModalMember("CREATE")}
            >
              Thêm thành viên
            </Button>
          )
        }
      />

      <Card>
        <Toolbar>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="sm:w-48"
            aria-label="Lọc theo trạng thái"
          >
            <option value="ACTIVE">Đang học</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
            <option value="ALL">Tất cả thành viên</option>
          </Select>
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên, mã SV, email..."
            label="Tìm kiếm thành viên"
          />
        </Toolbar>

        {loading ? (
          <div className="p-8">
            <PageSkeleton />
          </div>
        ) : error ? (
          <Empty
            icon="alert"
            title="Lỗi tải dữ liệu"
            text={error}
            action={<Button onClick={loadMembers}>Thử lại</Button>}
          />
        ) : items.length === 0 ? (
          <Empty
            icon="users"
            title={
              search
                ? "Không tìm thấy thành viên phù hợp"
                : "Chưa có thành viên nào"
            }
            text={
              search
                ? "Thử tìm với từ khóa khác."
                : "Thêm thành viên để bắt đầu quản lý danh sách lớp."
            }
          />
        ) : (
          <DataTable cols={cols} rows={items} rowKey={(m) => m.id} />
        )}
      </Card>

      {modalMember && (
        <MemberModal
          member={modalMember === "CREATE" ? null : modalMember}
          onClose={() => setModalMember(null)}
          onSuccess={loadMembers}
        />
      )}

      {togglingMember && (
        <ConfirmDialog
          title={
            togglingMember.status === "ACTIVE"
              ? 'Chuyển sang "Ngừng hoạt động"?'
              : "Khôi phục thành viên?"
          }
          confirmLabel={
            togglingMember.status === "ACTIVE"
              ? "Ngừng hoạt động"
              : "Kích hoạt lại"
          }
          tone={togglingMember.status === "ACTIVE" ? "danger" : "primary"}
          onClose={() => setTogglingMember(null)}
          message={
            togglingMember.status === "ACTIVE"
              ? `Thành viên ${togglingMember.name} (${togglingMember.code}) sẽ chuyển sang trạng thái ngừng hoạt động. Lịch sử tài chính và giao dịch cũ vẫn được bảo lưu nguyên vẹn.`
              : `Thành viên ${togglingMember.name} (${togglingMember.code}) sẽ được kích hoạt lại và tiếp tục tham gia các đợt đóng quỹ mới.`
          }
          onConfirm={handleToggleStatus}
        />
      )}
    </>
  )
}
