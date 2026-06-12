"use client"

import type { ViewKey } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Bell, LogOut, Search } from "lucide-react"

const TITLES: Record<ViewKey, { title: string; crumb: string }> = {
  access: { title: "Universal Access Gate", crumb: "Authentication" },
  studio: { title: "Document Interaction Studio", crumb: "Workspace / Studio" },
  graph: { title: "Methodology Graph Workspace", crumb: "Workspace / Graph" },
  portal: { title: "Teacher Evaluation Portal", crumb: "Workspace / Portal" },
}

export function Topbar({
  view,
  authed,
  name,
  onSignOut,
}: {
  view: ViewKey
  authed: boolean
  name: string | null
  onSignOut: () => void
}) {
  const { title, crumb } = TITLES[view]
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-card/80 px-5 py-3 backdrop-blur">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{crumb}</p>
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        {name && <p className="truncate text-xs text-muted-foreground">Signed in as {name}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground lg:flex">
          <Search className="size-4" aria-hidden="true" />
          <span>Search workspace...</span>
          <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </div>
        <Button variant="outline" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
        {authed && (
          <Button variant="outline" onClick={onSignOut} className="gap-2">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        )}
      </div>
    </header>
  )
}
