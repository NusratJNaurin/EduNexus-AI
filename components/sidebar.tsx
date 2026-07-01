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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { profilesCrud, sectionEnrollmentsCrud } from "@/lib/crud"
import { Button } from "@/components/ui/button"
import { useUserSession } from "@/components/user-session-context"

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
}: {
  active: ViewKey
  onNavigate: (v: ViewKey) => void
  authed: boolean
  canAccessPortal: boolean
}) {
  const {
    profileId,
    profileName,
    profileMajor,
    profileRole,
    setProfileName,
    setProfileMajor,
  } = useUserSession()

  // Role-based navigation filtering:
  // Students    → sections, studio, graph (NOT portal)
  // Faculty     → studio, graph, portal (NOT sections)
  // Researchers → studio, graph (NOT sections, NOT portal)
  const userRole = profileRole?.trim().toLowerCase() ?? ""
  const isResearcher = userRole === "researcher"
  const visibleNav = authed
    ? NAV.filter((item) => {
        if (canAccessPortal) return item.key !== "sections"
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

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const isStudent = authed && profileRole === "student"
  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState("")
  const [profileDraftName, setProfileDraftName] = useState(profileName ?? "")
  const [profileDraftMajor, setProfileDraftMajor] = useState(profileMajor ?? "")
  const [profileDraftPassword, setProfileDraftPassword] = useState("")

  useEffect(() => {
    if (!profileEditorOpen) return
    setProfileDraftName(profileName ?? "")
    setProfileDraftMajor(profileMajor ?? "")
    setProfileDraftPassword("")
    setProfileError("")
    setProfileSuccess("")
  }, [profileEditorOpen, profileMajor, profileName])

  const handleSaveProfile = useCallback(async () => {
    const nextName = profileDraftName.trim()
    const nextMajor = profileDraftMajor.trim()

    if (!profileId) {
      setProfileError("No authenticated profile was found.")
      return
    }

    if (!nextName) {
      setProfileError("Name is required.")
      return
    }

    if (!nextMajor) {
      setProfileError("Major is required.")
      return
    }

    setProfileSaving(true)
    setProfileError("")
    setProfileSuccess("")

    try {
      await profilesCrud.updateById(profileId, {
        full_name: nextName,
        academic_domain: nextMajor,
      })

      if (profileDraftPassword.trim()) {
        const { error } = await supabase.auth.updateUser({ password: profileDraftPassword.trim() })
        if (error) throw error
      }

      setProfileName(nextName)
      setProfileMajor(nextMajor)
      setProfileSuccess("Profile updated successfully.")
      setProfileDraftPassword("")

      window.setTimeout(() => {
        setProfileEditorOpen(false)
        setProfileSuccess("")
      }, 700)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update profile."
      setProfileError(message)
    } finally {
      setProfileSaving(false)
    }
  }, [profileDraftMajor, profileDraftName, profileDraftPassword, profileId, setProfileMajor, setProfileName])

  const handleJoinClass = useCallback(async () => {
    const code = inviteCode.trim()
    if (!code) {
      setToast({ type: "error", message: "Please enter an invite code." })
      return
    }

    setJoining(true)
    setToast(null)

    try {
      // 1. Look up the class_sections record that matches this invite code
      const { data: section, error: sectionError } = await supabase
        .from("class_sections")
        .select("*")
        .eq("invite_code", code)
        .maybeSingle()

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

      {/* ── Join Class with Code (student only) ─────────────────────────────── */}
      {isStudent && (
        <div className="border-t border-sidebar-border px-4 py-3">
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
      <div className="border-t border-sidebar-border p-4">
        <button
          type="button"
          onClick={() => setProfileEditorOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent/80"
        >
          <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            {authed ? getInitials(profileName) : "—"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{authed ? (profileName || "Profile") : "Guest"}</p>
            <p className="truncate text-xs text-sidebar-foreground/50 capitalize">
              {authed ? (profileMajor || profileRole || "Academic profile") : "Not signed in"}
            </p>
          </div>
        </button>
      </div>

      {profileEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile settings</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-card-foreground">Edit your profile</h2>
                <p className="mt-1 text-sm text-muted-foreground">You can change your name, password, and major only.</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileEditorOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-card-foreground">Name</span>
                <input
                  value={profileDraftName}
                  onChange={(event) => setProfileDraftName(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-card-foreground">Password</span>
                <input
                  type="password"
                  value={profileDraftPassword}
                  onChange={(event) => setProfileDraftPassword(event.target.value)}
                  placeholder="Leave blank to keep your current password"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-card-foreground">Major</span>
                <input
                  value={profileDraftMajor}
                  onChange={(event) => setProfileDraftMajor(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              {profileError && <p className="text-sm text-destructive">{profileError}</p>}
              {profileSuccess && <p className="text-sm text-emerald-600">{profileSuccess}</p>}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setProfileEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveProfile} disabled={profileSaving}>
                {profileSaving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}