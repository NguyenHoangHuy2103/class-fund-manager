import { type ReactNode } from "react"
import { navigate, useRoute } from "../lib/router"
import { useStore } from "../lib/store"
import { Avatar, Badge, Button, cx, Icon, Popover, MenuItem } from "./ui"

export const NAV = [
  {
    path: "",
    label: "Tổng quan",
    icon: "home",
    roles: ["ADMIN", "MEMBER"] as const,
  },
  {
    path: "collections",
    label: "Đóng quỹ",
    icon: "wallet",
    roles: ["ADMIN", "MEMBER"] as const,
  },
  {
    path: "ledger",
    label: "Thu chi",
    icon: "book",
    roles: ["ADMIN", "MEMBER"] as const,
  },
  {
    path: "members",
    label: "Thành viên",
    icon: "users",
    roles: ["ADMIN"] as const,
  },
]

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="bg-hero relative inline-flex size-10 items-center justify-center overflow-hidden rounded-xl text-white shadow-sm">
        <Icon name="wallet" size={22} className="relative z-10" />
      </span>
      <span
        className={cx(
          "text-xl font-extrabold tracking-tight",
          light ? "text-white" : "text-ink",
        )}
      >
        Quỹ Lớp
      </span>
    </div>
  )
}

function AccountMenu({ up, compact }: { up?: boolean; compact?: boolean }) {
  const { user, role, logout } = useStore()
  if (!user) return null

  const displayName = user.member?.name || user.email.split("@")[0]
  const roleLabel = role === "ADMIN" ? "Quản trị viên" : "Thành viên"

  return (
    <Popover
      up={up}
      align={up ? "left" : "right"}
      width="w-64"
      trigger={(p) =>
        compact ? (
          <button
            {...p}
            aria-label="Menu tài khoản"
            className="rounded-full transition-shadow hover:ring-2 hover:ring-sky"
          >
            <Avatar name={displayName} size={40} />
          </button>
        ) : (
          <button
            {...p}
            className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-white/10"
          >
            <Avatar name={displayName} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-white">
                {displayName}
              </span>
              <span className="block truncate text-sm text-mist">
                {roleLabel}
              </span>
            </span>
            <Icon name="dots" className="text-mist" />
          </button>
        )
      }
    >
      {(close) => (
        <div>
          <div className="px-3 py-2">
            <p className="font-bold text-ink">{displayName}</p>
            <p className="text-sm text-subtle">{user.email}</p>
            <Badge tone={role === "ADMIN" ? "warn" : "info"} className="mt-2">
              {roleLabel}
            </Badge>
          </div>
          <div className="my-1 border-t border-line" />
          <MenuItem
            icon="logout"
            danger
            onClick={() => {
              close()
              logout()
            }}
          >
            Đăng xuất
          </MenuItem>
        </div>
      )}
    </Popover>
  )
}

const TITLES: Record<string, string> = {
  "": "Tổng quan",
  collections: "Đóng quỹ",
  ledger: "Sổ thu–chi",
  members: "Danh sách thành viên",
}

export function Shell({ children }: { children: (page: string) => ReactNode }) {
  const { role, logout } = useStore()
  const r = useRoute()

  const items = NAV.filter((n) =>
    (n.roles as readonly ("ADMIN" | "MEMBER")[]).includes(role),
  )
  const allowed = items.some((n) => n.path === r.page)

  const roleLabel = role === "ADMIN" ? "Quản trị viên" : "Thành viên"

  return (
    <div className="min-h-dvh lg:pl-[272px]">
      {/* Desktop Sidebar */}
      <aside className="bg-hero fixed inset-y-0 left-0 z-20 hidden w-[272px] lg:block">
        <div className="absolute inset-0 bg-ink/65" />
        <div className="relative flex h-full flex-col p-4">
          <div className="px-2 py-3">
            <Logo light />
          </div>

          <nav
            aria-label="Điều hướng chính"
            className="mt-5 flex-1 space-y-1.5 overflow-y-auto"
          >
            {items.map((n) => {
              const active = r.page === n.path
              return (
                <a
                  key={n.path}
                  href={"#/" + n.path}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors",
                    active
                      ? "bg-white text-ink shadow-sm"
                      : "text-white/85 hover:bg-white/12",
                  )}
                >
                  <Icon
                    name={n.icon}
                    size={20}
                    className={active ? "text-brand-ink" : ""}
                  />
                  <span className="flex-1">{n.label}</span>
                </a>
              )
            })}
          </nav>

          <div className="border-t border-white/15 pt-3">
            <AccountMenu up />
          </div>
        </div>
      </aside>

      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="lg:hidden">
              <Logo />
            </span>
            <h1 className="hidden text-lg font-bold text-ink sm:block">
              {TITLES[r.page] || "Quỹ Lớp"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              tone={role === "ADMIN" ? "warn" : "info"}
              className="hidden sm:inline-flex"
            >
              {roleLabel}
            </Badge>
            <div className="hidden lg:block">
              <AccountMenu compact />
            </div>
            <Button
              size="sm"
              variant="secondary"
              icon="logout"
              onClick={logout}
              className="lg:hidden"
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
        {!allowed ? (
          <div className="py-12 text-center">
            <p className="text-lg font-bold text-bad">
              Bạn không có quyền truy cập trang này.
            </p>
            <Button className="mt-4" onClick={() => navigate("/", true)}>
              Về trang Tổng quan
            </Button>
          </div>
        ) : (
          <div>{children(r.page)}</div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Điều hướng di động"
        className={cx(
          "fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden",
          items.length === 4 ? "grid-cols-4" : "grid-cols-3",
        )}
      >
        {items.map((n) => {
          const active = r.page === n.path
          return (
            <a
              key={n.path}
              href={"#/" + n.path}
              aria-current={active ? "page" : undefined}
              className={cx(
                "relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold",
                active ? "text-brand-ink" : "text-subtle",
              )}
            >
              {active && (
                <span className="absolute inset-x-4 top-0 h-0.5 rounded-b bg-brand" />
              )}
              <Icon name={n.icon} size={20} />
              {n.label}
            </a>
          )
        })}
      </nav>
    </div>
  )
}
