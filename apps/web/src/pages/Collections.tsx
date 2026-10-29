import { useEffect, useState } from "react"
import {
  api,
  type CollectionItem,
  type CollectionDetail as ICollectionDetail,
} from "../lib/api"
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
  KV,
  Modal,
  MoneyInput,
  PageHeader,
  PageSkeleton,
  Progress,
  Tabs,
  Textarea,
  Toolbar,
  useBusy,
  useToast,
  type Col,
} from "../components/ui"
import { fmtDate, parseMoney, todayISO, vnd } from "../lib/format"
import { navigate } from "../lib/router"
import { useStore } from "../lib/store"

function CreateCollectionModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const toast = useToast()
  const { busy, run } = useBusy()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const parsedAmount = parseMoney(amount)
    if (name.trim().length < 3) return setError("Tên đợt thu ít nhất 3 ký tự")
    if (parsedAmount <= 0) return setError("Số tiền phải lớn hơn 0")

    setError(null)
    run(async () => {
      try {
        await api.collections.create({
          name: name.trim(),
          description: description.trim() || undefined,
          amount: parsedAmount,
          dueDate: dueDate || undefined,
        })
        toast("success", `Đã tạo đợt thu "${name.trim()}" thành công.`)
        onSuccess()
        onClose()
      } catch (err: any) {
        setError(err.message || "Không thể tạo đợt thu.")
      }
    })
  }

  return (
    <Modal
      title="Tạo đợt thu quỹ mới"
      subtitle="Áp dụng cho toàn bộ thành viên đang học trong lớp."
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button variant="primary" loading={busy} onClick={handleSubmit}>
            Tạo đợt thu
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

        <Field label="Tên đợt thu quỹ" required>
          {(p) => (
            <Input
              {...p}
              data-autofocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Quỹ lớp đầu kỳ HK1, Quà 20/11..."
              disabled={busy}
            />
          )}
        </Field>

        <Field label="Mục đích thu (Mô tả)">
          {(p) => (
            <Textarea
              {...p}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chi tiết về mục đích sử dụng số tiền này..."
              className="min-h-20"
              disabled={busy}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Số tiền mỗi thành viên" required>
            {(p) => (
              <MoneyInput
                {...p}
                value={amount}
                onChange={setAmount}
                placeholder="100.000"
                disabled={busy}
              />
            )}
          </Field>

          <Field label="Hạn nộp (Không bắt buộc)">
            {(p) => (
              <Input
                {...p}
                type="date"
                min={todayISO()}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={busy}
              />
            )}
          </Field>
        </div>
      </form>
    </Modal>
  )
}

export function Collections() {
  const { role } = useStore()
  const [tab, setTab] = useState<"ALL" | "OPEN" | "CLOSED">("ALL")
  const [items, setItems] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const loadCollections = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.collections.list(tab)
      setItems(res.data.items)
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách đợt thu.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCollections()
  }, [tab])

  const cols: Col<CollectionItem>[] = [
    {
      key: "name",
      header: "Đợt thu quỹ",
      title: true,
      cell: (c) => (
        <div>
          <span className="block font-semibold text-ink">{c.name}</span>
          {c.description && (
            <span className="block max-w-xs truncate text-xs text-subtle">
              {c.description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Mức đóng",
      align: "right",
      cell: (c) => <span className="tnum font-semibold">{vnd(c.amount)}</span>,
    },
    {
      key: "collected",
      header: "Đã thu",
      align: "right",
      cell: (c) => <b className="tnum text-ok">{vnd(c.totalCollected)}</b>,
    },
    {
      key: "progress",
      header: "Tiến độ lớp",
      cell: (c) => (
        <div className="min-w-28">
          <div className="tnum mb-1 flex justify-between text-xs text-subtle">
            <span>
              {c.paidCount}/{c.totalMembers} người
            </span>
            <b>{c.progressPercent}%</b>
          </div>
          <Progress pct={c.progressPercent} label={c.name} />
        </div>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (c) =>
        c.status === "OPEN" ? (
          <Badge tone="info" icon="clock">
            Đang mở
          </Badge>
        ) : (
          <Badge tone="neutral" icon="checkcircle">
            Đã đóng
          </Badge>
        ),
    },
    ...(role === "MEMBER"
      ? [
          {
            key: "myStatus",
            header: "Của bạn",
            cell: (c: CollectionItem) =>
              c.myStatus === "PAID" ? (
                <Badge tone="success" icon="check">
                  Đã đóng
                </Badge>
              ) : (
                <Badge tone="danger" icon="clock">
                  Chưa đóng
                </Badge>
              ),
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title="Đóng quỹ lớp"
        desc="Theo dõi các đợt thu quỹ, tiến độ đóng của thành viên và xem trạng thái nộp tiền."
        actions={
          role === "ADMIN" && (
            <Button
              variant="primary"
              icon="plus"
              onClick={() => setCreating(true)}
            >
              Tạo đợt thu
            </Button>
          )
        }
      />

      <Card>
        <Toolbar>
          <Tabs
            label="Trạng thái đợt thu"
            value={tab}
            onChange={setTab}
            items={[
              { key: "ALL", label: "Tất cả" },
              { key: "OPEN", label: "Đang mở" },
              { key: "CLOSED", label: "Đã đóng" },
            ]}
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
            action={<Button onClick={loadCollections}>Thử lại</Button>}
          />
        ) : items.length === 0 ? (
          <Empty
            icon="wallet"
            title="Chưa có đợt thu quỹ nào"
            text={
              role === "ADMIN"
                ? 'Bấm nút "Tạo đợt thu" để bắt đầu thu quỹ cho hoạt động lớp.'
                : "Hiện tại lớp chưa có đợt đóng quỹ nào."
            }
            action={
              role === "ADMIN" ? (
                <Button
                  variant="primary"
                  icon="plus"
                  onClick={() => setCreating(true)}
                >
                  Tạo đợt thu
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            cols={cols}
            rows={items}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate("/collections/" + c.id)}
            rowLabel={(c) => `Xem chi tiết đợt thu ${c.name}`}
          />
        )}
      </Card>

      {creating && (
        <CreateCollectionModal
          onClose={() => setCreating(false)}
          onSuccess={loadCollections}
        />
      )}
    </>
  )
}

export function CollectionDetail({ id }: { id: string }) {
  const { role, user } = useStore()
  const toast = useToast()
  const [data, setData] = useState<ICollectionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmingMember, setConfirmingMember] = useState<{
    id: string
    name: string
  } | null>(null)
  const [paymentNote, setPaymentNote] = useState("")
  const [togglingStatus, setTogglingStatus] = useState(false)

  const loadDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.collections.get(id)
      setData(res.data)
    } catch (err: any) {
      setError(err.message || "Không thể tải chi tiết đợt thu.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [id])

  if (loading) return <PageSkeleton />

  if (error || !data) {
    return (
      <Card className="p-8 text-center">
        <Empty
          icon="alert"
          title="Không tìm thấy đợt thu"
          text={error || "Đợt thu này không tồn tại."}
          action={
            <Button onClick={() => navigate("/collections")}>
              Về danh sách đợt thu
            </Button>
          }
        />
      </Card>
    )
  }

  const handleConfirmPayment = async () => {
    if (!confirmingMember) return
    try {
      await api.collections.confirmPayment(
        data.id,
        confirmingMember.id,
        paymentNote.trim() || undefined,
      )
      toast(
        "success",
        `Đã xác nhận đóng quỹ thành công cho ${confirmingMember.name}.`,
      )
      setConfirmingMember(null)
      setPaymentNote("")
      loadDetail()
    } catch (err: any) {
      return err.message || "Không thể xác nhận thanh toán."
    }
  }

  const handleToggleStatus = async () => {
    const nextStatus = data.status === "OPEN" ? "CLOSED" : "OPEN"
    try {
      await api.collections.updateStatus(data.id, nextStatus)
      toast(
        "success",
        nextStatus === "OPEN"
          ? "Đã mở lại đợt thu quỹ."
          : "Đã đóng đợt thu quỹ.",
      )
      setTogglingStatus(false)
      loadDetail()
    } catch (err: any) {
      return err.message || "Lỗi khi cập nhật trạng thái đợt thu."
    }
  }

  const myRecord = user?.member?.id
    ? data.members.find((m) => m.memberId === user.member!.id)
    : null

  const memberCols: Col<ICollectionDetail["members"][number]>[] = [
    {
      key: "name",
      header: "Thành viên",
      title: true,
      cell: (m) => (
        <span className="flex items-center gap-3">
          <Avatar name={m.name} size={32} />
          <span>
            <span className="block font-semibold text-ink">{m.name}</span>
            <span className="block text-xs text-subtle">{m.code}</span>
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (m) =>
        m.status === "PAID" ? (
          <Badge tone="success" icon="check">
            Đã nộp đủ
          </Badge>
        ) : (
          <Badge tone="neutral" icon="clock">
            Chưa nộp
          </Badge>
        ),
    },
    {
      key: "paidAt",
      header: "Ngày nộp",
      cell: (m) =>
        m.payment?.paidAt ? (
          <span className="tnum text-sm">{fmtDate(m.payment.paidAt)}</span>
        ) : (
          <span className="text-subtle text-sm">—</span>
        ),
    },
    ...(role === "ADMIN"
      ? [
          {
            key: "action",
            header: "",
            align: "right" as const,
            noMobileLabel: true,
            cell: (m: ICollectionDetail["members"][number]) =>
              m.status === "UNPAID" && data.status === "OPEN" ? (
                <Button
                  size="sm"
                  variant="primary"
                  icon="check"
                  onClick={() =>
                    setConfirmingMember({ id: m.memberId, name: m.name })
                  }
                >
                  Xác nhận đã nộp
                </Button>
              ) : null,
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title={data.name}
        desc={
          data.description || "Chi tiết khoản đóng quỹ và danh sách thành viên."
        }
        actions={
          <div className="flex gap-2">
            <Button icon="chevr" onClick={() => navigate("/collections")}>
              Quay lại danh sách
            </Button>
            {role === "ADMIN" && (
              <Button
                variant={data.status === "OPEN" ? "secondary" : "primary"}
                onClick={() => setTogglingStatus(true)}
              >
                {data.status === "OPEN" ? "Đóng đợt thu" : "Mở lại đợt thu"}
              </Button>
            )}
          </div>
        }
      />

      {/* Thông tin tiến độ đợt thu */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-subtle">
                Tiến độ thu toàn lớp
              </p>
              <p className="tnum mt-1 text-3xl font-extrabold tracking-tight text-ink">
                {vnd(data.totalCollected)}{" "}
                <span className="text-lg font-semibold text-subtle">
                  / {vnd(data.targetAmount)}
                </span>
              </p>
            </div>
            {data.status === "OPEN" ? (
              <Badge tone="info" icon="clock">
                Đang mở
              </Badge>
            ) : (
              <Badge tone="neutral" icon="checkcircle">
                Đã đóng
              </Badge>
            )}
          </div>

          <div className="mt-5">
            <Progress pct={data.progressPercent} label="Tiến độ đợt thu" />
          </div>

          <div className="tnum mt-3 flex flex-wrap justify-between gap-2 text-sm text-subtle">
            <span>
              <b>{data.progressPercent}%</b> hoàn thành
            </span>
            <span>
              {data.paidCount}/{data.totalMembers} thành viên đã đóng · còn
              thiếu <b>{vnd(data.remainingAmount)}</b>
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <dl className="divide-y divide-line">
            <KV label="Mức đóng">{vnd(data.amount)}/người</KV>
            <KV label="Hạn đóng">
              {data.dueDate ? fmtDate(data.dueDate) : "Không giới hạn"}
            </KV>
            <KV label="Số thành viên">{data.totalMembers} thành viên</KV>
            <KV label="Ngày tạo">{fmtDate(data.createdAt)}</KV>
          </dl>
        </Card>
      </div>

      {/* Tình trạng đóng của cá nhân (Dành cho Member) */}
      {role === "MEMBER" && myRecord && (
        <Card className="mt-5 p-5 sm:p-6 border-2 border-brand/20 bg-canvas">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-subtle">
                Tình trạng nộp quỹ của bạn
              </p>
              <h3 className="text-xl font-bold text-ink mt-0.5">
                {myRecord.status === "PAID"
                  ? "Bạn đã đóng đủ khoản này"
                  : "Bạn chưa đóng khoản này"}
              </h3>
            </div>
            {myRecord.status === "PAID" ? (
              <Badge
                tone="success"
                icon="checkcircle"
                className="text-sm py-1.5 px-3"
              >
                Đã xác nhận ({fmtDate(myRecord.payment!.paidAt)})
              </Badge>
            ) : (
              <Badge tone="danger" icon="alert" className="text-sm py-1.5 px-3">
                Cần đóng: {vnd(data.amount)}
              </Badge>
            )}
          </div>
          {myRecord.status === "UNPAID" && (
            <p className="mt-2 text-sm text-subtle">
              Vui lòng chuyển khoản cho ban cán sự lớp hoặc nộp tiền mặt trực
              tiếp để được xác nhận.
            </p>
          )}
        </Card>
      )}

      {/* Danh sách thành viên cả lớp (Minh bạch) */}
      <Card className="mt-5">
        <div className="p-4 border-b border-line">
          <h2 className="text-base font-bold text-ink">
            Danh sách đóng quỹ cả lớp (Công khai & Minh bạch)
          </h2>
        </div>
        <DataTable
          cols={memberCols}
          rows={data.members}
          rowKey={(m) => m.memberId}
        />
      </Card>

      {/* Modal xác nhận thanh toán */}
      {confirmingMember && (
        <ConfirmDialog
          title="Xác nhận đóng tiền"
          confirmLabel="Xác nhận đã nhận đủ tiền"
          onClose={() => setConfirmingMember(null)}
          message={
            <>
              Bạn xác nhận đã nhận đủ <b>{vnd(data.amount)}</b> từ thành viên{" "}
              <b>{confirmingMember.name}</b> cho đợt thu <b>{data.name}</b>.
              <br />
              Hệ thống sẽ tự động ghi 1 khoản thu vào sổ quỹ và tính vào số dư.
            </>
          }
          onConfirm={handleConfirmPayment}
        >
          <Field label="Ghi chú xác nhận (Không bắt buộc)">
            {(p) => (
              <Input
                {...p}
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Ví dụ: Đã nhận tiền mặt / Đã nhận chuyển khoản"
              />
            )}
          </Field>
        </ConfirmDialog>
      )}

      {/* Modal đóng / mở lại đợt thu */}
      {togglingStatus && (
        <ConfirmDialog
          title={
            data.status === "OPEN"
              ? "Đóng đợt thu quỹ này?"
              : "Mở lại đợt thu quỹ này?"
          }
          confirmLabel={data.status === "OPEN" ? "Đóng đợt thu" : "Mở lại"}
          tone={data.status === "OPEN" ? "danger" : "primary"}
          onClose={() => setTogglingStatus(false)}
          message={
            data.status === "OPEN"
              ? "Sau khi đóng, đợt thu sẽ không nhận thêm xác nhận đóng tiền mới."
              : "Sau khi mở lại, thủ quỹ có thể tiếp tục xác nhận nộp tiền cho các thành viên còn thiếu."
          }
          onConfirm={handleToggleStatus}
        />
      )}
    </>
  )
}
