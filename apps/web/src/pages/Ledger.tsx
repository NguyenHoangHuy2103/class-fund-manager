import { useState, useEffect } from "react"
import {
  Badge,
  Card,
  Icon,
  PageHeader,
} from "../components/ui"
import { api } from "../lib/api"

function formatVnd(val?: string | number | bigint): string {
  if (!val && val !== 0) return "0 đ"
  const n = typeof val === "string" ? BigInt(val || 0) : BigInt(val)
  return new Intl.NumberFormat("vi-VN").format(n) + " đ"
}

export default function Ledger() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [fundFilter, setFundFilter] = useState<string>("ALL")
  const [balances, setBalances] = useState<any>(null)

  const loadData = async (page = 1, fund?: string) => {
    try {
      setLoading(true)
      const [txRes, dashRes] = await Promise.all([
        api.transactions.list({
          page,
          fundType: fund && fund !== "ALL" ? fund : undefined,
          limit: 15,
        }),
        api.dashboard.overview(),
      ])

      setTransactions(txRes.data.items)
      setPagination(txRes.data.pagination)
      setBalances(dashRes.data.balances)
    } catch (err: any) {
      console.error("Lỗi tải sổ quỹ:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(1, fundFilter)
  }, [fundFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sổ quỹ & Lịch sử dòng tiền"
        desc="Nguồn sự thật duy nhất (Single Source of Truth) ghi nhận toàn bộ bút toán thu chi minh bạch của lớp."
      />

      {/* 3 THẺ SỐ DƯ QUỸ (LEDGER SSOT) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 border-l-4 border-l-brand">
          <div className="flex items-center justify-between text-subtle text-xs font-semibold">
            <span>TỔNG SỐ DƯ QUỸ</span>
            <Icon name="wallet" size={18} className="text-brand" />
          </div>
          <div className="mt-2 text-2xl font-black text-ink">
            {formatVnd(balances?.totalBalance)}
          </div>
          <p className="mt-1 text-xs text-subtle">
            Tổng dòng tiền thực tế
          </p>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-subtle text-xs font-semibold">
            <span>QUỸ TIỀN MẶT (CASH)</span>
            <Icon name="coins" size={18} className="text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">
            {formatVnd(balances?.cashBalance)}
          </div>
          <p className="mt-1 text-xs text-subtle">
            Tiền mặt thủ quỹ đang giữ
          </p>
        </Card>

        <Card className="p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-subtle text-xs font-semibold">
            <span>QUỸ NGÂN HÀNG (BANK)</span>
            <Icon name="credit-card" size={18} className="text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-700">
            {formatVnd(balances?.bankBalance)}
          </div>
          <p className="mt-1 text-xs text-subtle">
            Chuyển khoản Napas247 / VietQR
          </p>
        </Card>
      </div>

      {/* BẢNG SỔ CÁI VÀ BỘ LỌC */}
      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-ink">Danh sách bút toán sổ cái</h3>
            <span className="text-xs text-subtle">({pagination.total} giao dịch)</span>
          </div>

          {/* Bộ lọc kênh tiền */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              onClick={() => setFundFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                fundFilter === "ALL" ? "bg-white text-ink shadow-sm" : "text-subtle hover:text-ink"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFundFilter("CASH")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                fundFilter === "CASH" ? "bg-white text-emerald-700 shadow-sm" : "text-subtle hover:text-ink"
              }`}
            >
              Tiền mặt
            </button>
            <button
              onClick={() => setFundFilter("BANK")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                fundFilter === "BANK" ? "bg-white text-blue-700 shadow-sm" : "text-subtle hover:text-ink"
              }`}
            >
              Ngân hàng
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-subtle text-sm py-8 text-center">Đang tải sổ cái...</p>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="book" size={40} className="mx-auto text-subtle mb-3" />
            <h4 className="font-bold text-base text-ink">Chưa có giao dịch sổ cái nào</h4>
            <p className="text-xs text-subtle mt-1">
              Mọi khoản thu tiền mặt hoặc duyệt biên lai chuyển khoản sẽ tự động ghi sổ cái tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-subtle">
                  <th className="py-2.5 px-3">Mã phiếu</th>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Loại / Kênh</th>
                  <th className="py-2.5 px-3">Người nộp / Đối tác</th>
                  <th className="py-2.5 px-3">Diễn giải</th>
                  <th className="py-2.5 px-3 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => {
                  const isCash = tx.fundType === "CASH"

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-mono font-bold text-xs text-ink">
                        {tx.code}
                      </td>
                      <td className="py-3 px-3 text-xs text-subtle whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge tone={isCash ? "success" : "info"}>
                          {isCash ? "Tiền mặt" : "Ngân hàng"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-xs font-semibold text-ink">
                        {tx.counterparty || "—"}
                      </td>
                      <td className="py-3 px-3 text-xs text-ink max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-emerald-600 whitespace-nowrap">
                        +{formatVnd(tx.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border mt-4 text-xs">
            <span className="text-subtle">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadData(pagination.page - 1, fundFilter)}
                className="px-3 py-1.5 rounded-lg border border-border bg-white text-ink disabled:opacity-40 hover:bg-slate-50"
              >
                Trang trước
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadData(pagination.page + 1, fundFilter)}
                className="px-3 py-1.5 rounded-lg border border-border bg-white text-ink disabled:opacity-40 hover:bg-slate-50"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
