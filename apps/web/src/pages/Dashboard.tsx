import { useEffect, useState } from "react"
import { api, type DashboardSummary } from "../lib/api"
import {
  Button,
  Card,
  Empty,
  Icon,
  PageSkeleton,
  Progress,
  SectionTitle,
  Stat,
} from "../components/ui"
import { fmtDate, vnd } from "../lib/format"
import { navigate } from "../lib/router"
import { useStore } from "../lib/store"

export default function Dashboard() {
  const { user, role } = useStore()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.dashboard.getSummary()
      setData(res.data)
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu bảng điều khiển.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) return <PageSkeleton />

  if (error || !data) {
    return (
      <Card className="p-8 text-center">
        <Empty
          icon="alert"
          title="Không thể tải dữ liệu"
          text={error || "Đã xảy ra lỗi khi kết nối với máy chủ."}
          action={<Button onClick={loadData}>Thử lại</Button>}
        />
      </Card>
    )
  }

  const displayName = user?.member?.name || user?.email.split("@")[0] || ""

  return (
    <div className="space-y-6">
      {/* Hero Banner: Số dư quỹ */}
      <section
        aria-label="Số dư quỹ"
        className="bg-hero relative overflow-hidden rounded-[24px] p-6 text-white shadow-card sm:p-8"
      >
        <div
          className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/50 to-ink/20"
          aria-hidden
        />
        <div className="relative">
          <p className="text-[16px] font-medium text-white/90">
            Xin chào, <b className="font-bold text-white">{displayName}</b>
          </p>
          <p className="mt-1 text-sm text-white/80">
            Hệ thống quản lý quỹ lớp minh bạch với {data.totalActiveMembers}{" "}
            thành viên đang học.
          </p>

          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-white/80">
            Số dư quỹ hiện tại
          </p>
          <p className="tnum mt-1 text-[38px] font-extrabold leading-none tracking-tight sm:text-[48px]">
            {vnd(data.balance)}
          </p>

          {/* Cảnh báo nợ quỹ dành cho thành viên */}
          {role === "MEMBER" && data.myUnpaid.amount > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-white/15 px-4 py-2.5 backdrop-blur-sm">
              <Icon name="clock" size={18} className="text-warn" />
              <span className="text-sm font-medium">
                Bạn có <b>{data.myUnpaid.count}</b> đợt thu chưa đóng, tổng còn
                thiếu: <b>{vnd(data.myUnpaid.amount)}</b>
              </span>
              <button
                onClick={() => navigate("/collections")}
                className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-white underline hover:text-mist"
              >
                Xem chi tiết →
              </button>
            </div>
          )}

          {/* Nút hành động nhanh */}
          <div className="mt-6 flex flex-wrap gap-3">
            {role === "ADMIN" ? (
              <>
                <Button
                  className="bg-white text-ink hover:bg-mist"
                  icon="plus"
                  onClick={() => navigate("/collections")}
                >
                  Tạo đợt thu quỹ
                </Button>
                <Button
                  className="border border-white/40 bg-white/10 text-white hover:bg-white/20"
                  icon="arrowup"
                  onClick={() => navigate("/ledger")}
                >
                  Ghi khoản chi
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="bg-white text-ink hover:bg-mist"
                  icon="wallet"
                  onClick={() => navigate("/collections")}
                >
                  Đóng quỹ của tôi
                </Button>
                <Button
                  className="border border-white/40 bg-white/10 text-white hover:bg-white/20"
                  icon="book"
                  onClick={() => navigate("/ledger")}
                >
                  Xem sổ thu chi
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 3 Thẻ thống kê tài chính */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Tổng thu toàn kỳ"
          value={vnd(data.totalIncome)}
          sub="Bao gồm đóng quỹ và tài trợ"
          icon="arrowdown"
          tone="success"
          onClick={() => navigate("/ledger")}
        />
        <Stat
          label="Tổng chi toàn kỳ"
          value={vnd(data.totalExpense)}
          sub="Các hoạt động chi tiêu của lớp"
          icon="arrowup"
          tone="danger"
          onClick={() => navigate("/ledger")}
        />
        <Stat
          label="Thành viên đang học"
          value={`${data.totalActiveMembers} người`}
          sub={
            data.totalClassRemainingToCollect > 0
              ? `Cả lớp còn thiếu ${vnd(data.totalClassRemainingToCollect)}`
              : "Đã đóng đủ toàn bộ các đợt"
          }
          icon="users"
          tone="info"
          onClick={() => (role === "ADMIN" ? navigate("/members") : undefined)}
        />
      </div>

      {/* Danh sách đợt thu đang mở và Giao dịch gần đây */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Đợt thu đang mở */}
        <Card className="p-5 sm:p-6">
          <SectionTitle
            title="Đợt thu quỹ đang mở"
            action={
              <button
                onClick={() => navigate("/collections")}
                className="text-sm font-semibold text-brand-ink hover:underline"
              >
                Xem tất cả
              </button>
            }
          />

          {data.openCollections.length === 0 ? (
            <Empty
              icon="wallet"
              title="Chưa có đợt thu nào đang mở"
              text="Khi có hoạt động phát sinh, ban cán sự sẽ tạo đợt thu mới."
            />
          ) : (
            <ul className="space-y-3">
              {data.openCollections.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => navigate("/collections/" + c.id)}
                    className="w-full rounded-2xl border border-line p-4 text-left transition-colors hover:border-sky hover:bg-tint/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-ink leading-snug">
                        {c.name}
                      </p>
                      {role === "MEMBER" && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            c.hasMyPayment
                              ? "bg-ok-bg text-ok"
                              : "bg-bad-bg text-bad"
                          }`}
                        >
                          {c.hasMyPayment ? "Bạn đã đóng" : "Bạn chưa đóng"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-subtle">
                      Mức đóng: <b>{vnd(c.amount)}</b>/thành viên
                      {c.dueDate && ` · Hạn đóng: ${fmtDate(c.dueDate)}`}
                    </p>
                    <div className="mt-3">
                      <Progress pct={c.percent} label={c.name} />
                    </div>
                    <p className="tnum mt-2 flex justify-between text-xs text-subtle">
                      <span>
                        Đã thu: {c.paidCount}/{c.totalMembers} thành viên
                      </span>
                      <b>{c.percent}%</b>
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Giao dịch gần đây */}
        <Card className="p-5 sm:p-6">
          <SectionTitle
            title="Giao dịch gần nhất"
            action={
              <button
                onClick={() => navigate("/ledger")}
                className="text-sm font-semibold text-brand-ink hover:underline"
              >
                Xem sổ quỹ
              </button>
            }
          />

          {data.recentTransactions.length === 0 ? (
            <Empty
              icon="book"
              title="Chưa có giao dịch nào"
              text="Các khoản thu và chi sẽ hiển thị ở đây."
            />
          ) : (
            <ul className="-mx-2 divide-y divide-line/70">
              {data.recentTransactions.map((t) => {
                const isIncome = t.type === "INCOME"
                return (
                  <li key={t.id} className="flex items-center gap-3 px-3 py-3">
                    <span
                      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${
                        isIncome ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"
                      }`}
                    >
                      <Icon
                        name={isIncome ? "arrowdown" : "arrowup"}
                        size={18}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">
                        {t.description}
                      </p>
                      <p className="text-xs text-subtle">
                        {fmtDate(t.date)} · {t.category}
                      </p>
                    </div>
                    <span
                      className={`tnum shrink-0 text-[15px] font-bold ${
                        isIncome ? "text-ok" : "text-bad"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      {vnd(t.amount)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
