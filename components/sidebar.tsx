"use client"

import {
  GraduationCap,
  FileText,
  Workflow,
  ClipboardList,
  Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type ViewKey = "access" | "studio" | "graph" | "portal"

const NAV: {
  key: ViewKey
  label: string
  sub: string
  icon: typeof FileText
  requiresAuth: boolean
}[] = [
  { key: "studio", label: "Document Interaction Studio", sub: "Read & analyze", icon: FileText, requiresAuth: true },
  { key: "graph", label: "Methodology Graph Workspace", sub: "Knowledge map", icon: Workflow, requiresAuth: true },
  { key: "portal", label: "Teacher Evaluation Portal", sub: "Analytics", icon: ClipboardList, requiresAuth: true },
]

export function Sidebar({
  active,
  onNavigate,
  authed,
  canAccessPortal,
  name,
  role,
}: {
  active: ViewKey
  onNavigate: (v: ViewKey) => void
  authed: boolean
  canAccessPortal: boolean
  name?: string | null
  role?: string | null
}) {
  // Filters out access elements and strictly distributes view paths based on authorization credentials.
  // Faculty can see all workspace modules; students see only studio & graph (portal is hidden).
  const visibleNav = authed
    ? NAV.filter((item) => (canAccessPortal ? true : item.key !== "portal"))
    : []

  // Helper logic to cleanly extract double initials from names dynamically
  const getInitials = (fullName: string | null | undefined) => {
    if (!fullName) return "U"
    return fullName
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="size-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">EduNexus AI</p>
          <p className="truncate text-xs text-sidebar-foreground/60">Qatar University</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary">
        <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
          Workspace
        </p>
        {visibleNav.map((item) => {
          const Icon = item.icon
          const locked = item.requiresAuth && !authed
          const isActive = active === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => !locked && onNavigate(item.key)}
              disabled={locked}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                locked && "cursor-not-allowed opacity-40 hover:bg-transparent",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium leading-tight">{item.label}</span>
                <span
                  className={cn(
                    "block truncate text-xs leading-tight",
                    isActive ? "text-sidebar-primary-foreground/70" : "text-sidebar-foreground/45",
                  )}
                >
                  {item.sub}
                </span>
              </span>
              {locked && <Lock className="size-3.5 shrink-0" aria-hidden="true" />}
            </button>
          )
        })}
      </nav>

      {/* Dynamic Profile Identifier Interface */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            {authed ? getInitials(name) : "—"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {authed ? (name || "Academic User") : "Guest"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/50 capitalize">
              {authed ? (role || "Student") : "Not signed in"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}