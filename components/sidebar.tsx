"use client"

import {
  GraduationCap,
  ShieldCheck,
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
  { key: "access", label: "Universal Access Gate", sub: "Authentication", icon: ShieldCheck, requiresAuth: false },
  { key: "studio", label: "Document Interaction Studio", sub: "Read & analyze", icon: FileText, requiresAuth: true },
  { key: "graph", label: "Methodology Graph Workspace", sub: "Knowledge map", icon: Workflow, requiresAuth: true },
  { key: "portal", label: "Teacher Evaluation Portal", sub: "Analytics", icon: ClipboardList, requiresAuth: true },
]

export function Sidebar({
  active,
  onNavigate,
  authed,
  canAccessPortal,
}: {
  active: ViewKey
  onNavigate: (v: ViewKey) => void
  authed: boolean
  canAccessPortal: boolean
}) {
  const visibleNav = authed
    ? NAV.filter((item) => (canAccessPortal ? item.key === "portal" : item.key !== "portal"))
    : NAV.filter((item) => item.key === "access")

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

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            {authed ? "AH" : "—"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{authed ? "Dr. Aisha Hassan" : "Guest"}</p>
            <p className="truncate text-xs text-sidebar-foreground/50">
              {authed ? "Researcher · Computer Eng." : "Not signed in"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
