import { Shell } from "./components/Shell"
import { ToastProvider, PageSkeleton } from "./components/ui"
import { StoreProvider, useStore } from "./lib/store"
import Login from "./pages/Login"
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
  const { user, loading } = useStore()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-md">
          <PageSkeleton />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

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
