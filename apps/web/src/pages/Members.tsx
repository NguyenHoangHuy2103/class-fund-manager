import { useEffect, useState } from "react"
import { api, type MemberItem } from "../lib/api"
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  Empty,
  Icon,
  PageHeader,
  PageSkeleton,
  SearchBox,
  Toolbar,
  useBusy,
  useToast,
  type Col,
} from "../components/ui"
import { useStore } from "../lib/store"
import { useRealtimeRefresh } from "../lib/realtime"

export default function Members() {
  const { role } = useStore()
  const toast = useToast()
  const { busy, run } = useBusy()

  const [members, setMembers] = useState<MemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const isTreasurer = role === "TREASURER"

  const fetchMembers = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.members.list({
        search,
        status: statusFilter,
      })
      setMembers(res.data.items)
    } catch (err: any) {
      if (!silent) toast("error", err.message || "Lỗi tải danh sách thành viên")
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Tự động làm mới dữ liệu thành viên khi có sự kiện (Real-time SSE & Focus change)
  useRealtimeRefresh(() => {
    fetchMembers(true)
  })

  useEffect(() => {
    fetchMembers()
  }, [search, statusFilter])

  const handleApprove = (member: MemberItem) => {
    run(async () => {
      try {
        await api.members.approve(member.id)
        toast("success", `Đã duyệt thành viên ${member.displayName} vào lớp.`)
        fetchMembers()
      } catch (err: any) {
        toast("error", err.message)
      }
    })
  }

  const handleReject = (member: MemberItem) => {
    run(async () => {
      try {
        await api.members.reject(member.id)
        toast("info", `Đã từ chối yêu cầu của ${member.displayName}.`)
        fetchMembers()
      } catch (err: any) {
        toast("error", err.message)
      }
    })
  }

  const handleToggleStatus = (member: MemberItem) => {
    const nextStatus = member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    run(async () => {
      try {
        await api.members.setStatus(member.id, nextStatus)
        toast(
          "success",
          `Đã đổi trạng thái ${member.displayName} sang ${nextStatus === "ACTIVE" ? "Hoạt động" : "Tạm khóa"}.`,
        )
        fetchMembers()
      } catch (err: any) {
        toast("error", err.message)
      }
    })
  }

  const cols: Col<MemberItem>[] = [
    {
      key: "displayName",
      header: "Họ và tên",
      cell: (m: MemberItem) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.displayName} size={36} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">{m.displayName}</span>
              {m.role === "TREASURER" && (
                <Badge tone="warn">Thủ quỹ</Badge>
              )}
            </div>
            <p className="text-xs text-subtle">
              {m.memberCode ? `MSSV: ${m.memberCode}` : "Chưa có MSSV"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (m: MemberItem) => {
        switch (m.status) {
          case "ACTIVE":
            return <Badge tone="success">Đang hoạt động</Badge>
          case "PENDING":
            return <Badge tone="warn">Chờ duyệt</Badge>
          case "REJECTED":
            return <Badge tone="danger">Bị từ chối</Badge>
          case "INACTIVE":
            return <Badge tone="neutral">Tạm dừng</Badge>
        }
      },
    },
    ...(isTreasurer
      ? [
          {
            key: "actions",
            header: "Thao tác",
            align: "right" as const,
            cell: (m: MemberItem) => (
              <div className="flex items-center justify-end gap-2">
                {m.status === "PENDING" && (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleApprove(m)}
                      disabled={busy}
                    >
                      Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleReject(m)}
                      disabled={busy}
                    >
                      Từ chối
                    </Button>
                  </>
                )}
                {m.status === "ACTIVE" && m.role !== "TREASURER" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleStatus(m)}
                    disabled={busy}
                  >
                    Tạm khóa
                  </Button>
                )}
                {m.status === "INACTIVE" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleToggleStatus(m)}
                    disabled={busy}
                  >
                    Mở lại
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ]

  const pendingCount = members.filter((m) => m.status === "PENDING").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý thành viên lớp"
        desc="Xem danh sách thành viên và phê duyệt yêu cầu tham gia lớp học."
      />

      {isTreasurer && pendingCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-amber-200 text-amber-800">
              <Icon name="users" size={18} />
            </span>
            <div>
              <p className="font-bold">Có {pendingCount} thành viên đang chờ phê duyệt</p>
              <p className="text-xs text-amber-700">Duyệt để các bạn có thể bắt đầu xem quỹ và đóng tiền.</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setStatusFilter("PENDING")}
          >
            Lọc người chờ duyệt
          </Button>
        </div>
      )}

      <Toolbar>
        <div className="w-full sm:w-72">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên hoặc MSSV..."
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "PENDING", label: `Chờ duyệt ${pendingCount > 0 ? `(${pendingCount})` : ""}` },
            { id: "ACTIVE", label: "Đang hoạt động" },
            { id: "REJECTED", label: "Đã từ chối" },
            { id: "INACTIVE", label: "Tạm khóa" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? "bg-ink text-white"
                  : "bg-sand/30 text-ink-muted hover:bg-sand/60 hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Toolbar>

      <Card>
        {loading ? (
          <div className="p-6">
            <PageSkeleton />
          </div>
        ) : members.length === 0 ? (
          <Empty
            icon="users"
            title="Không tìm thấy thành viên"
            text="Không có thành viên nào khớp với bộ lọc hiện tại."
          />
        ) : (
          <DataTable cols={cols} rows={members} rowKey={(m) => m.id} />
        )}
      </Card>
    </div>
  )
}
