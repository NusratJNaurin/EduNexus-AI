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
}: {
  active: ViewKey
  onNavigate: (v: ViewKey) => void
  authed: boolean
  canAccessPortal: boolean
  name?: string | null
  role?: string | null
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
  }, [])

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-hidden border-r border-[#d2b47a]/20 bg-[linear-gradient(180deg,#4f1021_0%,#53111f_36%,#4a0f1d_100%)] text-[#f7e9d6] shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)] md:flex">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(197,160,89,0.2),transparent_28%),radial-gradient(circle_at_12%_95%,rgba(197,160,89,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_30%,rgba(0,0,0,0.1))]" />
      <svg
        viewBox="0 0 800 800"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-55"
        aria-hidden="true"
      >
        <path d="M800 0H672c-9 0-18 4-24 11l-37 42c-6 7-15 11-24 11h-42c-10 0-18-8-18-18V0" fill="none" stroke="#A25656" strokeOpacity="0.42" strokeWidth="6" />
        <path d="M0 800h128c9 0 18-4 24-11l37-42c6-7 15-11 24-11h42c10 0 18 8 18 18v46" fill="none" stroke="#A25656" strokeOpacity="0.42" strokeWidth="6" />
        <path d="M737 0v118c0 9-4 18-11 24l-42 37c-7 6-11 15-11 24v42c0 10 8 18 18 18h109" fill="none" stroke="#A25656" strokeOpacity="0.42" strokeWidth="6" />
        <path d="M63 800V682c0-9 4-18 11-24l42-37c7-6 11-15 11-24v-42c0-10-8-18-18-18H0" fill="none" stroke="#A25656" strokeOpacity="0.42" strokeWidth="6" />
        <circle cx="723" cy="77" r="60" fill="none" stroke="#C5A059" strokeOpacity="0.15" strokeWidth="10" />
        <circle cx="723" cy="77" r="35" fill="none" stroke="#C5A059" strokeOpacity="0.12" strokeWidth="8" />
        <circle cx="77" cy="723" r="60" fill="none" stroke="#C5A059" strokeOpacity="0.12" strokeWidth="10" />
        <circle cx="77" cy="723" r="35" fill="none" stroke="#C5A059" strokeOpacity="0.1" strokeWidth="8" />
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.08)_52%,rgba(35,5,10,0.18)_100%)]" />

      <div className="relative z-10 border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3 rounded-[20px] border border-[#d7bb7e]/10 bg-[rgba(46,8,16,0.24)] px-4 py-3 shadow-[0_14px_32px_rgba(20,3,8,0.2)] backdrop-blur-[2px]">
          <div className="flex size-11 items-center justify-center rounded-[16px] bg-[#d3b16f] text-[#22120d] shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
            <GraduationCap className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold tracking-[-0.02em] text-[#fff4e2]">EduNexus AI</p>
            <p className="truncate text-sm text-[#f7e9d6]/68">Qatar University</p>
          </div>
        </div>
      </div>

      <nav className="relative z-10 flex flex-1 flex-col gap-1 px-4 pb-4 pt-5" aria-label="Primary">
        <p className="px-2 pb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f2d8c5]/45">
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
                "group flex items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm transition-all duration-200",
                isActive
                  ? "bg-[#d3b16f] text-[#24140f] shadow-[0_14px_30px_rgba(0,0,0,0.18)]"
                  : "text-[#f7e9d6]/92 hover:bg-white/6 hover:text-[#fff7ea]",
                locked && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-[#f7e9d6]/92",
              )}
            >
              <Icon className={cn("size-5 shrink-0", isActive ? "text-[#24140f]" : "text-[#f3debf]/88")} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium leading-tight tracking-[-0.01em]">{item.label}</span>
                <span
                  className={cn(
                    "block truncate text-xs leading-tight",
                    isActive ? "text-[#24140f]/72" : "text-[#f7e9d6]/50",
                  )}
                >
                  {item.sub}
                </span>
              </span>
              {locked && <Lock className={cn("size-3.5 shrink-0", isActive ? "text-[#24140f]/75" : "text-[#f7e9d6]/55")} aria-hidden="true" />}
            </button>
          )
        })}
      </nav>

      {/* ── Join Class with Code (student only) ─────────────────────────────── */}
      {isStudent && (
        <div className="relative z-10 border-t border-white/10 px-4 py-3">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f2d8c5]/45">
            Join Class with Code
          </p>
          <div className="flex items-center gap-2">
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              disabled={joining}
              onKeyDown={(e) => { if (e.key === "Enter") handleJoinClass() }}
              className="flex-1 rounded-full border border-white/8 bg-[rgba(255,255,255,0.05)] px-4 py-2.5 text-sm text-[#fff4e2] outline-none placeholder:text-[#f7e9d6]/38 transition focus:border-[#d3b16f]/70 focus:bg-[rgba(255,255,255,0.07)] disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleJoinClass}
              disabled={joining || !inviteCode.trim()}
              className="flex shrink-0 items-center gap-1 rounded-full bg-[#d3b16f] px-4 py-2.5 text-sm font-medium text-[#24140f] transition hover:bg-[#e0c07d] disabled:opacity-50"
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
                "mt-2 flex items-center gap-1.5 rounded-2xl px-3 py-2 text-[11px] font-medium transition-all",
                toast.type === "success"
                  ? "bg-emerald-500/15 text-emerald-200"
                  : "bg-red-500/15 text-red-200",
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
                className="shrink-0 rounded p-0.5 transition-colors hover:bg-white/10"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Profile Identifier Interface */}
      <div className="relative z-10 border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.06)] px-4 py-3 shadow-[0_12px_26px_rgba(0,0,0,0.18)] backdrop-blur-[2px]">
          <div className="flex size-11 items-center justify-center rounded-full bg-[#d3b16f] text-sm font-bold text-[#24140f] shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
            {authed ? getInitials(name) : "—"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#fff4e2]">
              {authed ? (name || "Academic User") : "Guest"}
            </p>
            <p className="truncate text-xs capitalize text-[#f7e9d6]/56">
              {authed ? (role || "Student") : "Not signed in"}
            </p>
          </div>
          {authed && (
            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="shrink-0 rounded-lg p-1.5 text-[#f7e9d6]/52 transition-colors hover:bg-white/10 hover:text-[#fff4e2]"
              aria-label="Edit profile"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <EditProfileDialog
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        userId={profileUserId}
        initialName={name ?? null}
        initialRole={role ?? null}
        initialDomain={profileDomain}
        onProfileUpdated={() => {
          // Profile updated — parent will re-fetch on next render
          setEditProfileOpen(false)
        }}
      />
    </aside>
  )
}