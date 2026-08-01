"use client"

import { useState, useCallback, useEffect } from "react"
import {
  GraduationCap,
  FileText,
  Workflow,
  ClipboardList,
  LayoutDashboard,
  Lock,
  LogIn,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { sectionEnrollmentsCrud } from "@/lib/crud"
import type { ClassSectionRow } from "@/lib/types"
import { EditProfileDialog } from "@/components/edit-profile-dialog"

export type ViewKey = "access" | "studio" | "graph" | "portal" | "sections"

const NAV: {
  key: ViewKey
  label: string
  sub: string
  icon: typeof FileText
  requiresAuth: boolean
}[] = [
  { key: "sections", label: "My Sections", sub: "Enrolled classes", icon: LayoutDashboard, requiresAuth: true },
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
  onProfileUpdated,
}: {
  active: ViewKey
  onNavigate: (v: ViewKey) => void
  authed: boolean
  canAccessPortal: boolean
  name?: string | null
  role?: string | null
  onProfileUpdated?: () => void
}) {
  // Role-based navigation filtering:
  // Students    → sections, studio, graph (NOT portal)
  // Faculty     → studio, graph, portal (NOT sections)
  // Researchers → studio, graph (NOT sections, NOT portal)
  const userRole = role?.trim().toLowerCase() ?? ""
  const isResearcher = userRole === "researcher"
  const visibleNav = authed
    ? NAV.filter((item) => {
        if (userRole === "faculty") return item.key !== "sections"
        if (isResearcher) return item.key !== "sections" && item.key !== "portal"
        return item.key !== "portal"
      })
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

  // ── Invite code state & handler ──────────────────────────────────────────
  const [inviteCode, setInviteCode] = useState("")
  const [joining, setJoining] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [profileDomain, setProfileDomain] = useState<string | null>(null)

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const isStudent = authed && role === "student"

  const handleJoinClass = useCallback(async () => {
    const code = inviteCode.trim()
    if (!code) {
      setToast({ type: "error", message: "Please enter an invite code." })
      return
    }

    setJoining(true)
    setToast(null)

    try {
      // 1. Look up the class_sections record that matches this invite code (bypasses RLS for pre-enrollment lookup)
      const { data: sectionData, error: sectionError } = await supabase
        .rpc("get_section_by_invite_code", { code })
        .maybeSingle()

      // rpc with setof returns an array; extract the single row
      const section: ClassSectionRow | null = sectionData as ClassSectionRow | null

      if (sectionError) throw sectionError
      if (!section) {
        setToast({ type: "error", message: "Invalid invite code. No matching class found." })
        setJoining(false)
        return
      }

      // 2. Get the current authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        setToast({ type: "error", message: "You must be signed in to join a class." })
        setJoining(false)
        return
      }

      // 3. Check if the student is already enrolled in this section
      const { data: existingEnrollment } = await supabase
        .from("section_enrollments")
        .select("id")
        .eq("section_id", section.id)
        .eq("student_id", user.id)
        .maybeSingle()

      if (existingEnrollment) {
        setToast({ type: "success", message: `You are already enrolled in ${section.course_code} · Sec ${section.section_number}.` })
        setInviteCode("")
        setJoining(false)
        return
      }

      // 4. Insert the enrollment record
      await sectionEnrollmentsCrud.insertRecord({
        section_id: section.id,
        student_id: user.id,
        invite_code: code,
      })

      setToast({ type: "success", message: `Successfully joined ${section.course_code} · Sec ${section.section_number}!` })
      setInviteCode("")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join class. Please try again."
      setToast({ type: "error", message })
    } finally {
      setJoining(false)
    }
  }, [inviteCode])

  const handleOpenEditProfile = useCallback(async () => {
    setEditLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("academic_domain")
        .eq("id", user.id)
        .maybeSingle()

      setProfileUserId(user.id)
      setProfileDomain(profile?.academic_domain ?? null)
      setEditProfileOpen(true)
    } finally {
      setEditLoading(false)
    }
  }, [])

  return (
    <>
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      {/* Top-right mashrabiya lattice corner */}
      {/* Commented out — mashrabiya lattice SVG
      <svg
        width="180"
        height="180"
        viewBox="0 0 180 180"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute right-0 top-[264px] opacity-[0.35]"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="quarterCircleTR">
            <path d="M 180 180 L 180 0 A 120 120 0 0 0 60 180 Z" />
          </clipPath>
          <pattern id="latticeTileTR" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="none" stroke="#C5A059" strokeWidth="1" />
            <rect
              x="7.5"
              y="7.5"
              width="15"
              height="15"
              fill="none"
              stroke="#C5A059"
              strokeWidth="0.8"
              transform="rotate(45 15 15)"
            />
            <line x1="0" y1="0" x2="30" y2="30" stroke="#C5A059" strokeWidth="0.5" />
            <line x1="30" y1="0" x2="0" y2="30" stroke="#C5A059" strokeWidth="0.5" />
            <line x1="15" y1="0" x2="15" y2="30" stroke="#C5A059" strokeWidth="0.4" />
            <line x1="0" y1="15" x2="30" y2="15" stroke="#C5A059" strokeWidth="0.4" />
            <line x1="0" y1="7.5" x2="7.5" y2="0" stroke="#C5A059" strokeWidth="0.5" />
            <line x1="22.5" y1="0" x2="30" y2="7.5" stroke="#C5A059" strokeWidth="0.5" />
            <line x1="0" y1="22.5" x2="7.5" y2="30" stroke="#C5A059" strokeWidth="0.5" />
            <line x1="22.5" y1="30" x2="30" y2="22.5" stroke="#C5A059" strokeWidth="0.5" />
            <rect
              x="3.75"
              y="3.75"
              width="7.5"
              height="7.5"
              fill="none"
              stroke="#C5A059"
              strokeWidth="0.6"
              transform="rotate(45 7.5 7.5)"
            />
            <rect
              x="18.75"
              y="3.75"
              width="7.5"
              height="7.5"
              fill="none"
              stroke="#C5A059"
              strokeWidth="0.6"
              transform="rotate(45 22.5 7.5)"
            />
            <rect
              x="3.75"
              y="18.75"
              width="7.5"
              height="7.5"
              fill="none"
              stroke="#C5A059"
              strokeWidth="0.6"
              transform="rotate(45 7.5 22.5)"
            />
            <rect
              x="18.75"
              y="18.75"
              width="7.5"
              height="7.5"
              fill="none"
              stroke="#C5A059"
              strokeWidth="0.6"
              transform="rotate(45 22.5 22.5)"
            />
            <line x1="7.5" y1="0" x2="7.5" y2="30" stroke="#C5A059" strokeWidth="0.3" />
            <line x1="22.5" y1="0" x2="22.5" y2="30" stroke="#C5A059" strokeWidth="0.3" />
            <line x1="0" y1="7.5" x2="30" y2="7.5" stroke="#C5A059" strokeWidth="0.3" />
            <line x1="0" y1="22.5" x2="30" y2="22.5" stroke="#C5A059" strokeWidth="0.3" />
            <line x1="3.75" y1="0" x2="3.75" y2="30" stroke="#C5A059" strokeWidth="0.25" />
            <line x1="26.25" y1="0" x2="26.25" y2="30" stroke="#C5A059" strokeWidth="0.25" />
            <line x1="0" y1="3.75" x2="30" y2="3.75" stroke="#C5A059" strokeWidth="0.25" />
            <line x1="0" y1="26.25" x2="30" y2="26.25" stroke="#C5A059" strokeWidth="0.25" />
          </pattern>
        </defs>
        <rect width="180" height="180" fill="url(#latticeTileTR)" clipPath="url(#quarterCircleTR)" />
        <path d="M 180 0 A 180 180 0 0 0 0 180" fill="none" stroke="#C5A059" strokeWidth="1.5" />
        <line x1="150" y1="0" x2="150" y2="8" stroke="#C5A059" strokeWidth="1" />
        <line x1="120" y1="0" x2="120" y2="8" stroke="#C5A059" strokeWidth="1" />
        <line x1="180" y1="150" x2="172" y2="150" stroke="#C5A059" strokeWidth="1" />
        <line x1="180" y1="120" x2="172" y2="120" stroke="#C5A059" strokeWidth="1" />
      </svg>
      */}

      {/* Bottom-left mashrabiya lattice corner */}
      {/* Commented out — mashrabiya lattice SVG
      <svg
        width="180"
        height="180"
        viewBox="0 0 180 180"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute bottom-0 left-0 rotate-180 opacity-[0.35]"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="quarterCircleBL">
            <path d="M 180 0 A 120 120 0 0 0 60 180 Z" />
          </clipPath>
          <pattern id="latticeTileBL" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="none" stroke="#C5A059" strokeWidth="1" />
            <rect
              x="7.5"
              y="7.5"
              width="15"
              height="15"
              fill="none"
              stroke="#C5A059"
              strokeWidth="0.8"
              transform="rotate(45 15 15)"
            />
            <line x1="0" y1="0" x2="30" y2="30" stroke="#C5A059" strokeWidth="0.5" />
            <line x1="30" y1="0" x2="0" y2="30" stroke="#C5A059" strokeWidth="0.5" />
            <line x1="15" y1="0" x2="15" y2="30" stroke="#C5A059" strokeWidth="0.4" />
            <line x1="0" y1="15" x2="30" y2="15" stroke="#C5A059" strokeWidth="0.4" />
            <line x1="0" y1="7.5" x2="7.5" y2="0" stroke="#C5A059" strokeWidth="0.5" />
            <line x1="22.5" y1="0" x2="30" y2="7.5" stroke="#C5A059" strokeWidth="0.5" />
            <line x1="0" y1="22.5" x2="7.5" y2="30" stroke="#C5A059" strokeWidth="0.5" />
            <line x1="22.5" y1="30" x2="30" y2="22.5" stroke="#C5A059" strokeWidth="0.5" />
            <rect
              x="3.75"
              y="3.75"
              width="7.5"
              height="7.5"
              fill="none"
              stroke="#C5A059"
              strokeWidth="0.6"
              transform="rotate(45 7.5 7.5)"
            />
            <rect
              x="18.75"
              y="3.75"
              width="7.5"
              height="7.5"
              fill="none"
              stroke="#C5A059"
              strokeWidth="0.6"
              transform="rotate(45 22.5 7.5)"
            />
            <rect
              x="3.75"
              y="18.75"
              width="7.5"
              height="7.5"
              fill="none"
              stroke="#C5A059"
              strokeWidth="0.6"
              transform="rotate(45 7.5 22.5)"
            />
            <rect
              x="18.75"
              y="18.75"
              width="7.5"
              height="7.5"
              fill="none"
              stroke="#C5A059"
              strokeWidth="0.6"
              transform="rotate(45 22.5 22.5)"
            />
            <line x1="7.5" y1="0" x2="7.5" y2="30" stroke="#C5A059" strokeWidth="0.3" />
            <line x1="22.5" y1="0" x2="22.5" y2="30" stroke="#C5A059" strokeWidth="0.3" />
            <line x1="0" y1="7.5" x2="30" y2="7.5" stroke="#C5A059" strokeWidth="0.3" />
            <line x1="0" y1="22.5" x2="30" y2="22.5" stroke="#C5A059" strokeWidth="0.3" />
            <line x1="3.75" y1="0" x2="3.75" y2="30" stroke="#C5A059" strokeWidth="0.25" />
            <line x1="26.25" y1="0" x2="26.25" y2="30" stroke="#C5A059" strokeWidth="0.25" />
            <line x1="0" y1="3.75" x2="30" y2="3.75" stroke="#C5A059" strokeWidth="0.25" />
            <line x1="0" y1="26.25" x2="30" y2="26.25" stroke="#C5A059" strokeWidth="0.25" />
          </pattern>
        </defs>
        <rect width="180" height="180" fill="url(#latticeTileBL)" clipPath="url(#quarterCircleBL)" />
        <path d="M 180 0 A 180 180 0 0 0 0 180" fill="none" stroke="#C5A059" strokeWidth="1.5" />
        <line x1="150" y1="0" x2="150" y2="8" stroke="#C5A059" strokeWidth="1" />
        <line x1="120" y1="0" x2="120" y2="8" stroke="#C5A059" strokeWidth="1" />
        <line x1="180" y1="150" x2="172" y2="150" stroke="#C5A059" strokeWidth="1" />
        <line x1="180" y1="120" x2="172" y2="120" stroke="#C5A059" strokeWidth="1" />
      </svg>
      */}

      <div className="relative z-10 flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="size-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">EduNexus AI</p>
          <p className="truncate text-xs text-sidebar-foreground/60">Qatar University</p>
        </div>
      </div>

      <nav className="relative z-10 flex flex-1 flex-col gap-1 p-3" aria-label="Primary">
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

      {/* ── Join Class with Code (student only) ─────────────────────────────── */}
      {isStudent && (
        <div className="relative z-10 border-t border-sidebar-border bg-sidebar/85 px-4 py-3 backdrop-blur-sm">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
            Join Class with Code
          </p>
          <div className="flex items-center gap-2">
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              disabled={joining}
              onKeyDown={(e) => { if (e.key === "Enter") handleJoinClass() }}
              className="flex-1 rounded-lg border border-sidebar-border bg-sidebar-accent px-2.5 py-1.5 text-xs text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/40 transition focus:border-sidebar-primary disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleJoinClass}
              disabled={joining || !inviteCode.trim()}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-sidebar-primary px-2.5 py-1.5 text-xs font-medium text-sidebar-primary-foreground transition hover:bg-sidebar-primary/90 disabled:opacity-50"
            >
              {joining ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <LogIn className="size-3.5" />
              )}
              Join
            </button>
          </div>

          {/* Inline toast notification */}
          {toast && (
            <div
              className={cn(
                "mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all",
                toast.type === "success"
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-red-500/15 text-red-600",
              )}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="size-3.5 shrink-0" />
              ) : (
                <AlertCircle className="size-3.5 shrink-0" />
              )}
              <span className="flex-1 leading-tight">{toast.message}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="shrink-0 rounded p-0.5 hover:bg-black/10 transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Profile Identifier Interface */}
      <div className="relative z-10 border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            {authed ? getInitials(name) : "—"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {authed ? (name || "Academic User") : "Guest"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/50 capitalize">
              {authed ? (role || "Student") : "Not signed in"}
            </p>
          </div>
          {authed && (
            <button
              type="button"
              onClick={handleOpenEditProfile}
              disabled={editLoading}
              className="shrink-0 rounded-lg p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors disabled:opacity-50"
              aria-label="Edit profile"
            >
              {editLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Pencil className="size-3.5" />}
            </button>
          )}
        </div>
      </div>

      </aside>
      <EditProfileDialog
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        userId={profileUserId}
        initialName={name ?? null}
        initialRole={role ?? null}
        initialDomain={profileDomain}
        onProfileUpdated={() => {
          setEditProfileOpen(false)
          onProfileUpdated?.()
        }}
      />
    </>
  )
}
