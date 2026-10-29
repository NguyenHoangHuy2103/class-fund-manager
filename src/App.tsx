import { Shell } from './components/Shell'
import { ToastProvider } from './components/ui'
import { StoreProvider, useStore } from './lib/store'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import { Collections, CollectionDetail } from './pages/Collections'
import Mine from './pages/Mine'
import Approvals from './pages/Approvals'
import Ledger from './pages/Ledger'
import Reports from './pages/Reports'
import Logs from './pages/Logs'
import Settings from './pages/Settings'
import { useRoute } from './lib/router'

function Pages({ page }: { page: string }) {
  const { id } = useRoute()
  switch (page) {
    case 'members': return <Members />
    case 'collections': return id ? <CollectionDetail id={id} /> : <Collections />
    case 'mine': return <Mine />
    case 'approvals': return <Approvals />
    case 'ledger': return <Ledger />
    case 'reports': return <Reports />
    case 'logs': return <Logs />
    case 'settings': return <Settings />
    default: return <Dashboard />
  }
}

function Root() {
  const { user } = useStore()
  if (!user) return <Login />
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
