import { Shell } from "./components/Shell"
import { ToastProvider, PageSkeleton } from "./components/ui"
import { StoreProvider, useStore } from "./lib/store"
import { useRealtimeConnection } from "./lib/realtime"
import Login from "./pages/Login"
import ClassOnboarding from "./pages/ClassOnboarding"
import PendingApproval from "./pages/PendingApproval"
import Dashboard from "./pages/Dashboard"
import Members from "./pages/Members"
import { Collections, CollectionDetail } from "./pages/Collections"
import Ledger from "./pages/Ledger"
import { useRoute } from "./lib/router"

function Pages({ page }: { page: string }) {
  const { id } = useRoute()
  switch (page) {
    case "members":
      return <Members />
    case "collections":
      return id ? <CollectionDetail id={id} /> : <Collections />
    case "ledger":
      return <Ledger />
    default:
      return <Dashboard />
  }
}

function Root() {
  const { user, isPending, isRejected, loading } = useStore()
  useRealtimeConnection()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-md">
          <PageSkeleton />
        </div>
      </div>
    )
  }

  // 1. Chưa đăng nhập
  if (!user) {
    return <Login />
  }

  // 2. Đã đăng nhập nhưng chưa tham gia lớp nào
  if (!user.memberships || user.memberships.length === 0) {
    return <ClassOnboarding />
  }

  // 3. Đang chờ thủ quỹ duyệt hoặc bị từ chối
  if (isPending || isRejected) {
    return <PendingApproval />
  }

  // 4. Thành viên chính thức -> Vào khung giao diện 3 Tab
  return <Shell>{(page) => <Pages page={page} />}</Shell>
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Root />
      </ToastProvider>
    </StoreProvider>
  )
}
