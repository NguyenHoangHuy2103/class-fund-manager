import { useState, type ReactNode } from "react"
import { navigate, useRoute } from "../lib/router"
import { useStore } from "../lib/store"
import { Avatar, Badge, cx, Icon, Popover, MenuItem } from "./ui"

// 3 Tab điều hướng chính chuẩn theo yêu cầu thiết kế tối giản
export const MAIN_NAV = [
  {
    path: "",
    label: "Tổng quan",
    icon: "home",
  },
  {
    path: "collections",
    label: "Đóng quỹ",
    icon: "wallet",
  },
  {
    path: "ledger",
    label: "Sổ quỹ",
    icon: "book",
  },
] as const

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
        Class Fund Manager
      </span>
    </div>
  )
}

function AccountMenu({ up, compact }: { up?: boolean; compact?: boolean }) {
  const { user, activeClass, activeMembership, role, logout } = useStore()
  const [copied, setCopied] = useState(false)
  if (!user) return null

  const displayName = activeMembership?.displayName || user.fullName || user.email.split("@")[0]
  const roleLabel = role === "TREASURER" ? "Thủ quỹ" : "Thành viên"

  const copyInviteCode = () => {
    if (activeClass?.inviteCode) {
      navigator.clipboard.writeText(activeClass.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Popover
      up={up}
      align={up ? "left" : "right"}
      width="w-72"
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
              <span className="block truncate text-xs text-mist">
                {roleLabel} {activeMembership?.memberCode ? `• ${activeMembership.memberCode}` : ""}
              </span>
            </span>
            <Icon name="dots" className="text-mist" />
          </button>
        )
      }
    >
      {(close) => (
        <div>
          <div className="px-4 py-3">
            <p className="font-bold text-ink">{displayName}</p>
            <p className="text-xs text-subtle truncate">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={role === "TREASURER" ? "warn" : "info"}>
                {roleLabel}
              </Badge>
              {activeMembership?.memberCode && (
                <span className="text-xs font-mono text-ink-muted">
                  MSSV: {activeMembership.memberCode}
                </span>
              )}
            </div>

            {/* Mã mời lớp */}
            {activeClass && (
              <div className="mt-3 rounded-lg border border-sand bg-sand/30 p-2.5">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>Mã mời vào lớp:</span>
                  <button
                    onClick={copyInviteCode}
                    className="font-semibold text-primary hover:underline"
                  >
                    {copied ? "Đã chép!" : "Sao chép"}
                  </button>
                </div>
                <p className="mt-0.5 font-mono text-sm font-bold tracking-wider text-ink">
                  {activeClass.inviteCode}
                </p>
              </div>
            )}
          </div>

          <div className="my-1 border-t border-line" />

          {/* Menu Quản lý dành cho Thủ quỹ */}
          {role === "TREASURER" && (
            <MenuItem
              icon="users"
              onClick={() => {
                close()
                navigate("/members")
              }}
            >
              Quản lý thành viên & Duyệt
            </MenuItem>
          )}

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
  ledger: "Sổ quỹ",
  members: "Quản lý thành viên",
}

export function Shell({ children }: { children: (page: string) => ReactNode }) {
  const { activeClass } = useStore()
  const r = useRoute()

  const title = TITLES[r.page] || "Quỹ lớp"
  const activePeriod = activeClass?.periods?.find((p) => p.status === "OPEN")

  return (
    <div className="min-h-dvh lg:pl-[272px]">
      {/* Desktop Sidebar */}
      <aside className="bg-hero fixed inset-y-0 left-0 z-20 hidden w-[272px] lg:block">
        <div className="absolute inset-0 bg-ink/65" />
        <div className="relative flex h-full flex-col p-4">
          <div className="p-3">
            <Logo light />
            {activeClass && (
              <div className="mt-3 rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
                <p className="truncate text-sm font-bold text-white">{activeClass.name}</p>
                <p className="text-xs text-mist">{activeClass.code} • {activePeriod?.name || "Kỳ 1"}</p>
              </div>
            )}
          </div>

          {/* 3 Main Navigation Tabs */}
          <nav className="mt-4 flex-1 space-y-1">
            {MAIN_NAV.map((n) => {
              const active = r.page === n.path
              return (
                <button
                  key={n.path}
                  type="button"
                  onClick={() => navigate(n.path ? `/${n.path}` : "/")}
                  className={cx(
                    "flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-[15px] font-semibold transition-colors",
                    active
                      ? "bg-white text-ink shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon name={n.icon} size={20} />
                  <span>{n.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="border-t border-white/10 pt-3">
            <AccountMenu />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-dvh flex-col pb-20 lg:pb-8">
        {/* Top Header */}
        <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <Logo />
              </div>
              <div>
                <h1 className="text-lg font-bold text-ink sm:text-xl">{title}</h1>
                {activeClass && (
                  <p className="text-xs text-ink-muted">
                    {activeClass.name} ({activeClass.code})
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <button
                type="button"
                aria-label="Thông báo"
                className="relative inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition hover:bg-sand/40 hover:text-ink"
              >
                <Icon name="bell" size={20} />
              </button>

              <AccountMenu compact />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children(r.page)}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Chỉ 3 Tab chính) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/95 px-2 py-1.5 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
          {MAIN_NAV.map((n) => {
            const active = r.page === n.path
            return (
              <button
                key={n.path}
                type="button"
                onClick={() => navigate(n.path ? `/${n.path}` : "/")}
                className={cx(
                  "flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-colors",
                  active ? "text-primary font-bold" : "text-ink-muted hover:text-ink",
                )}
              >
                <Icon name={n.icon} size={20} />
                <span className="text-[11px]">{n.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
