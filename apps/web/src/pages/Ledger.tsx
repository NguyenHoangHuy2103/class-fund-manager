import { useEffect, useState } from "react"
import { api, type TransactionItem } from "../lib/api"
import {
  Badge,
  Button,
  Card,
  DataTable,
  Empty,
  Field,
  Icon,
  Input,
  Modal,
  MoneyInput,
  PageHeader,
  PageSkeleton,
  SearchBox,
  Select,
  Tabs,
  Textarea,
  Toolbar,
  useBusy,
  useToast,
  type Col,
} from "../components/ui"
import { fmtDate, parseMoney, todayISO, vnd } from "../lib/format"
import { useStore } from "../lib/store"

function ExpenseModal({
  currentBalance,
  onClose,
  onSuccess,
}: {
  currentBalance: number
  onClose: () => void
  onSuccess: () => void
}) {
  const toast = useToast()
  const { busy, run } = useBusy()
  const categories = [
    "Hoạt động",
    "Văn phòng phẩm",
    "Quà tặng",
    "Cơ sở vật chất",
    "Chi khác",
  ]

  const [category, setCategory] = useState(categories[0])
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState("")
  const [counterparty, setCounterparty] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const parsedAmount = parseMoney(amount)
    if (parsedAmount <= 0) return setError("Số tiền chi phải lớn hơn 0")
    if (parsedAmount > currentBalance) {
      return setError(
        `Số tiền chi vượt quá số dư quỹ hiện có (${vnd(currentBalance)})`,
      )
    }
    if (description.trim().length < 3)
      return setError("Nội dung chi ít nhất 3 ký tự")
    if (!counterparty.trim())
      return setError("Vui lòng nhập người hoặc đơn vị nhận tiền")

    setError(null)
    run(async () => {
      try {
        const res = await api.transactions.createExpense({
          category,
          amount: parsedAmount,
          date,
          description: description.trim(),
          counterparty: counterparty.trim(),
          note: note.trim() || undefined,
        })
        toast("success", res.message)
        onSuccess()
        onClose()
      } catch (err: any) {
        setError(err.message || "Không thể ghi nhận khoản chi.")
      }
    })
  }

  return (
    <Modal
      title="Ghi nhận khoản chi quỹ"
      subtitle={`Số dư quỹ hiện tại: ${vnd(currentBalance)}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button variant="danger" loading={busy} onClick={handleSubmit}>
            Ghi nhận khoản chi
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
          <Field label="Số tiền chi" required>
            {(p) => (
              <MoneyInput
                {...p}
                data-autofocus
                value={amount}
                onChange={setAmount}
                placeholder="50.000"
                disabled={busy}
              />
            )}
          </Field>

          <Field label="Ngày phát sinh" required>
            {(p) => (
              <Input
                {...p}
                type="date"
                max={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={busy}
              />
            )}
          </Field>
        </div>

        <Field label="Nội dung chi tiêu" required>
          {(p) => (
            <Input
              {...p}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Mua nước ngọt liên hoan, in tài liệu..."
              disabled={busy}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hạng mục chi" required>
            {(p) => (
              <Select
                {...p}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={busy}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Người / Đơn vị nhận tiền" required>
            {(p) => (
              <Input
                {...p}
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="Ví dụ: Tiệm in Minh Tâm, Cửa hàng tiện lợi..."
                disabled={busy}
              />
            )}
          </Field>
        </div>

        <Field label="Ghi chú thêm (Không bắt buộc)">
          {(p) => (
            <Textarea
              {...p}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Chi tiết hóa đơn, người mua hộ..."
              className="min-h-20"
              disabled={busy}
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}

function IncomeModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const toast = useToast()
  const { busy, run } = useBusy()
  const categories = ["Tài trợ", "Thu khác"]

  const [category, setCategory] = useState(categories[0])
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState("")
  const [counterparty, setCounterparty] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const parsedAmount = parseMoney(amount)
    if (parsedAmount <= 0) return setError("Số tiền thu phải lớn hơn 0")
    if (description.trim().length < 3)
      return setError("Nội dung thu ít nhất 3 ký tự")
    if (!counterparty.trim())
      return setError("Vui lòng nhập người hoặc đơn vị nộp tiền")

    setError(null)
    run(async () => {
      try {
        const res = await api.transactions.createIncome({
          category,
          amount: parsedAmount,
          date,
          description: description.trim(),
          counterparty: counterparty.trim(),
          note: note.trim() || undefined,
        })
        toast("success", res.message)
        onSuccess()
        onClose()
      } catch (err: any) {
        setError(err.message || "Không thể ghi nhận khoản thu.")
      }
    })
  }

  return (
    <Modal
      title="Ghi nhận khoản thu ngoài"
      subtitle="Khoản thu từ tài trợ, quyên góp ngoài các đợt đóng quỹ định kỳ."
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button variant="primary" loading={busy} onClick={handleSubmit}>
            Ghi nhận khoản thu
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
          <Field label="Số tiền thu" required>
            {(p) => (
              <MoneyInput
                {...p}
                data-autofocus
                value={amount}
                onChange={setAmount}
                placeholder="200.000"
                disabled={busy}
              />
            )}
          </Field>

          <Field label="Ngày nhận" required>
            {(p) => (
              <Input
                {...p}
                type="date"
                max={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={busy}
              />
            )}
          </Field>
        </div>

        <Field label="Nội dung khoản thu" required>
          {(p) => (
            <Input
              {...p}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Tài trợ từ cựu sinh viên, giải thưởng phong trào..."
              disabled={busy}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hạng mục thu" required>
            {(p) => (
              <Select
                {...p}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={busy}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Người / Đơn vị nộp tiền" required>
            {(p) => (
              <Input
                {...p}
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="Ví dụ: Anh Nguyễn Văn B, Đoàn trường..."
                disabled={busy}
              />
            )}
          </Field>
        </div>

        <Field label="Ghi chú thêm (Không bắt buộc)">
          {(p) => (
            <Textarea
              {...p}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thông tin thêm..."
              className="min-h-20"
              disabled={busy}
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}

export default function Ledger() {
  const { role } = useStore()
  const [type, setType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL")
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<TransactionItem[]>([])
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addingExpense, setAddingExpense] = useState(false)
  const [addingIncome, setAddingIncome] = useState(false)

  const loadTransactions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.transactions.list({ type, search })
      setItems(res.data.items)
      if (res.data.summary) {
        setSummary(res.data.summary)
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải sổ thu–chi.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [type, search])

  const cols: Col<TransactionItem>[] = [
    {
      key: "code",
      header: "Mã GD",
      cell: (t) => <span className="tnum font-bold text-ink">{t.code}</span>,
    },
    {
      key: "date",
      header: "Ngày",
      cell: (t) => (
        <span className="tnum text-sm text-subtle">{fmtDate(t.date)}</span>
      ),
    },
    {
      key: "description",
      header: "Nội dung",
      title: true,
      cell: (t) => (
        <div>
          <span className="block font-semibold text-ink">{t.description}</span>
          <span className="block text-xs text-subtle">
            {t.category} · Đối tác: {t.counterparty}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Loại",
      cell: (t) =>
        t.type === "INCOME" ? (
          <Badge tone="success" icon="arrowdown">
            Thu
          </Badge>
        ) : (
          <Badge tone="danger" icon="arrowup">
            Chi
          </Badge>
        ),
    },
    {
      key: "amount",
      header: "Số tiền",
      align: "right",
      cell: (t) => (
        <b
          className={`tnum font-extrabold ${
            t.type === "INCOME" ? "text-ok" : "text-bad"
          }`}
        >
          {t.type === "INCOME" ? "+" : "−"}
          {vnd(t.amount)}
        </b>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Sổ thu – chi"
        desc="Toàn bộ lịch sử thu tiền và chi tiêu của quỹ lớp, công khai minh bạch cho cả lớp."
        actions={
          role === "ADMIN" && (
            <div className="flex gap-2">
              <Button icon="plus" onClick={() => setAddingIncome(true)}>
                Ghi khoản thu
              </Button>
              <Button
                variant="primary"
                icon="plus"
                onClick={() => setAddingExpense(true)}
              >
                Ghi khoản chi
              </Button>
            </div>
          )
        }
      />

      {/* Tóm tắt nhanh số dư quỹ */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
            Số dư hiện tại
          </p>
          <p className="tnum mt-1 text-2xl sm:text-3xl font-extrabold text-ink">
            {vnd(summary.balance)}
          </p>
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
            Tổng thu
          </p>
          <p className="tnum mt-1 text-2xl sm:text-3xl font-extrabold text-ok">
            +{vnd(summary.totalIncome)}
          </p>
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
            Tổng chi
          </p>
          <p className="tnum mt-1 text-2xl sm:text-3xl font-extrabold text-bad">
            −{vnd(summary.totalExpense)}
          </p>
        </Card>
      </div>

      <Card>
        <Toolbar>
          <Tabs
            label="Loại giao dịch"
            value={type}
            onChange={setType}
            items={[
              { key: "ALL", label: "Tất cả" },
              { key: "INCOME", label: "Tiền vào (Thu)" },
              { key: "EXPENSE", label: "Tiền ra (Chi)" },
            ]}
          />
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo mã GD, nội dung, người nộp/nhận..."
            label="Tìm giao dịch"
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
            action={<Button onClick={loadTransactions}>Thử lại</Button>}
          />
        ) : items.length === 0 ? (
          <Empty
            icon="book"
            title={
              search
                ? "Không tìm thấy giao dịch phù hợp"
                : "Chưa có giao dịch nào"
            }
            text={
              search
                ? "Thử tìm với từ khóa khác."
                : "Các khoản thu chi sẽ được ghi nhận tại đây."
            }
          />
        ) : (
          <DataTable cols={cols} rows={items} rowKey={(t) => t.id} />
        )}
      </Card>

      {addingExpense && (
        <ExpenseModal
          currentBalance={summary.balance}
          onClose={() => setAddingExpense(false)}
          onSuccess={loadTransactions}
        />
      )}

      {addingIncome && (
        <IncomeModal
          onClose={() => setAddingIncome(false)}
          onSuccess={loadTransactions}
        />
      )}
    </>
  )
}
