import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { api, setOnUnauthorized, type UserProfile } from "./api"

interface AuthContextValue {
  user: UserProfile | null
  role: "ADMIN" | "MEMBER"
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const res = await api.auth.me()
      setUser(res.data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Tự động kiểm tra phiên đăng nhập qua cookie
    refreshUser()

    setOnUnauthorized(() => {
      setUser(null)
    })
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password)
    setUser(res.data.user)
  }

  const logout = async () => {
    try {
      await api.auth.logout()
    } finally {
      setUser(null)
    }
  }

  const value: AuthContextValue = {
    user,
    role: user?.role || "MEMBER",
    loading,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useStore() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useStore must be used within StoreProvider")
  }
  return context
}
