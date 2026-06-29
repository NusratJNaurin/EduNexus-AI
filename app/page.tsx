"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sidebar, type ViewKey } from "@/components/sidebar"
import { AccessGate } from "../components/access-gate"
import { DocumentStudio } from "@/components/document-studio"
import { MethodologyGraph } from "@/components/methodology-graph"
import { StudentWorkspace } from "@/components/student-workspace"
import { TeacherPortal } from "../components/teacher-portal"
import { Topbar } from "@/components/topbar"
import { supabase } from "@/lib/supabase"
import type { ProfileRow, UserRole } from "@/lib/types"
import { normalizeRole } from "@/lib/types"
import { roleRequestsCrud } from "@/lib/crud"

type AuthRole = "student" | "faculty" | "researcher"

export default function Page() {
  const router = useRouter()
  const [view, setView] = useState<ViewKey>("access")
  const [authed, setAuthed] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileRole, setProfileRole] = useState<UserRole | null>(null)
  const [isFacultyVerified, setIsFacultyVerified] = useState(false)

  const authUserIdRef = useRef<string | null>(null)
  const isFaculty = normalizeRole(profileRole) === "faculty"

  const isQuEmail = useCallback((email: string | null | undefined): boolean => {
    if (!email) return false
    const lower = email.trim().toLowerCase()
    return lower.endsWith("@qu.edu.qa") || lower.endsWith("@student.qu.edu.qa")
  }, [])

  const resetWorkspaceState = useCallback(() => {
    setAuthed(false)
    setProfileId(null)
    setProfileName(null)
    setProfileRole(null)
    setIsFacultyVerified(false)
    setView("access")
  }, [])

  const rejectNonQuUser = useCallback(async () => {
    await supabase.auth.signOut()
    resetWorkspaceState()
    router.refresh()
    toast.error("Access Denied. EduNexus AI is restricted to verified Qatar University members.", {
      duration: 8000,
      position: "top-center",
    })
  }, [router, resetWorkspaceState])

  // ─── Check if a profile has onboarding data (full_name set) ─────────────
  const isProfileComplete = useCallback((profile: ProfileRow | null): boolean => {
    if (!profile) return false
    return !!profile.full_name && profile.full_name.trim().length > 0 && profile.full_name !== "New Academic User"
  }, [])

  // ─── Check faculty verification status ──────────────────────────────────
  const checkFacultyVerification = useCallback(async (userId: string) => {
    try {
      const requests = await roleRequestsCrud.fetchAll()
      const userRequest = requests.find((r) => r.user_id === userId)
      return userRequest?.status === "approved"
    } catch {
      return false
    }
  }, [])

  const navigateToRoleView = useCallback((role: string, isFacultyVerifiedFlag: boolean) => {
    if (role === "faculty") {
      // Faculty always go to studio/graph first; portal only if verified
      if (isFacultyVerifiedFlag) {
        setView("portal")
      } else {
        setView("studio") // They can use studio while waiting for verification
      }
    } else if (role === "student") {
      setView("sections")
    } else {
      setView("studio")
    }
  }, [])

  // ─── Load profile after auth ────────────────────────────────────────────
  const loadProfile = useCallback(async (userId: string) => {
    try {
      authUserIdRef.current = userId

      // Client-side email domain enforcement
      const { data: { session } } = await supabase.auth.getSession()
      const sessionEmail = session?.user?.email ?? null
      if (!isQuEmail(sessionEmail)) {
        await rejectNonQuUser()
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (profileError || !profile) {
        resetWorkspaceState()
        return
      }

      const parsedProfile = profile as ProfileRow
      const nextRole = normalizeRole(parsedProfile.role)
      const role: UserRole = nextRole || "student"

      setProfileId(parsedProfile.id)
      setProfileName(parsedProfile.full_name)
      setProfileRole(role)
      setAuthed(true)

      // Check faculty verification
      let facultyVerified = false
      if (role === "faculty") {
        facultyVerified = await checkFacultyVerification(userId)
      }
      setIsFacultyVerified(facultyVerified)

      // Check if profile is complete — if not, show onboarding
      if (!isProfileComplete(parsedProfile)) {
        setView("onboarding")
        return
      }

      // Navigate to role-appropriate view
      navigateToRoleView(role, facultyVerified)
    } catch {
      resetWorkspaceState()
    }
  }, [isQuEmail, rejectNonQuUser, resetWorkspaceState, checkFacultyVerification, isProfileComplete, navigateToRoleView])

  useEffect(() => {
    let isMounted = true
    let authSubscription: { unsubscribe: () => void } | null = null

    const initializeAuthState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Check email domain on initial load
      if (user?.id && user?.email) {
        if (!isQuEmail(user.email)) {
          await rejectNonQuUser()
          return
        }
        await loadProfile(user.id)
      } else {
        resetWorkspaceState()
      }

      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        const nextUserId = session?.user?.id ?? null

        // QU email enforcement on auth state change
        if (event === "SIGNED_IN" && session?.user?.email) {
          if (!isQuEmail(session.user.email)) {
            if (isMounted) {
              await rejectNonQuUser()
            }
            return
          }
          // After SIGNED_IN, load profile (will detect onboarding state)
          if (nextUserId) {
            await loadProfile(nextUserId)
          }
          return
        }

        if (event === "SIGNED_OUT" || !nextUserId || (authUserIdRef.current && nextUserId !== authUserIdRef.current)) {
          authUserIdRef.current = nextUserId
          resetWorkspaceState()
          router.refresh()
          return
        }

        if (nextUserId && nextUserId !== authUserIdRef.current) {
          void loadProfile(nextUserId)
        }
      })

      authSubscription = data.subscription
    }

    void initializeAuthState()

    return () => {
      isMounted = false
      authSubscription?.unsubscribe()
    }
  }, [router, loadProfile, isQuEmail, rejectNonQuUser, resetWorkspaceState])

  // ─── Handle auth completion (called after onboarding or direct auth) ────
  const handleAuthed = useCallback(async (role: AuthRole) => {
    setAuthed(true)
    setProfileRole(role)

    // Check faculty verification status
    let facultyVerified = false
    if (role === "faculty") {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          facultyVerified = await checkFacultyVerification(user.id)
        }
      } catch {
        // Non-critical
      }
    }
    setIsFacultyVerified(facultyVerified)

    // Immediately fetch the user's profile to set profileId / profileName
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()

        if (profile) {
          const parsed = profile as ProfileRow
          setProfileId(parsed.id)
          setProfileName(parsed.full_name)
        }
      }
    } catch {
      // Non-critical
    }

    // Navigate to the appropriate view
    if (role === "faculty" && !facultyVerified) {
      setView("faculty-pending")
    } else {
      navigateToRoleView(role, facultyVerified)
    }
  }, [checkFacultyVerification, navigateToRoleView])

  const handleShowOnboarding = useCallback(() => {
    setView("onboarding")
  }, [])

  const handleNavigate = (nextView: ViewKey) => {
    if (!authed) {
      setView("access")
      return
    }

    if (nextView === "portal" && isFaculty && !isFacultyVerified) {
      setView("faculty-pending")
      return
    }

    if (!isFaculty && nextView === "portal") {
      toast.error("Access Denied: The Teacher Evaluation Portal is restricted to faculty profiles.")
      return
    }

    setView(nextView)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1">
        {authed && view !== "onboarding" && view !== "faculty-pending" && (
          <Sidebar
            active={view}
            onNavigate={handleNavigate}
            authed={authed}
            canAccessPortal={isFaculty && isFacultyVerified}
            name={profileName}
            role={profileRole}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            view={view}
            authed={authed && view !== "onboarding" && view !== "faculty-pending"}
            name={profileName || "Guest"}
            onSignOut={async () => {
              await supabase.auth.signOut()
              resetWorkspaceState()
              router.refresh()
            }}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden">
            <div key={view} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {view === "access" && (
                <AccessGate
                  onAuthed={handleAuthed}
                  onShowOnboarding={handleShowOnboarding}
                  defaultStep="signin"
                />
              )}
              {view === "onboarding" && (
                <AccessGate
                  onAuthed={handleAuthed}
                  onShowOnboarding={handleShowOnboarding}
                  defaultStep="onboarding"
                />
              )}
              {view === "sections" && <StudentWorkspace />}
              {view === "studio" && <DocumentStudio />}
              {view === "graph" && <MethodologyGraph />}
              {view === "faculty-pending" && (
                <div className="p-8">
                  <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm text-center">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent/20">
                      <svg className="size-8 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold tracking-tight text-card-foreground">
                        Faculty Access Pending Approval
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Your faculty access request has been submitted. An administrator is reviewing your credentials.
                        You will be granted Teacher Evaluation Portal access shortly.
                      </p>
                    </div>
                    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-left text-sm">
                      <p className="font-medium text-card-foreground">In the meantime, you can:</p>
                      <ul className="mt-1.5 list-disc pl-4 text-xs text-muted-foreground space-y-1">
                        <li>Upload and analyze research documents in the Document Studio</li>
                        <li>Explore the Methodology Graph Workspace</li>
                        <li>Map knowledge dependencies between academic papers</li>
                      </ul>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setView("studio")}
                        className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Go to Document Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => setView("graph")}
                        className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        Go to Graph Workspace
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {view === "portal" && isFaculty && isFacultyVerified && (
                <TeacherPortal
                  profileId={profileId}
                  profileRole={profileRole}
                  profileName={profileName}
                  isVerified={true}
                />
              )}
              {view === "portal" && (!isFaculty || !isFacultyVerified) && (
                <div className="p-8 text-center">
                  <div className="mx-auto max-w-md space-y-4">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
                      <svg className="size-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-foreground">Teacher Evaluation Portal</p>
                    <p className="text-sm text-muted-foreground">
                      {isFaculty
                        ? "Your faculty access is pending administrator approval. You will be notified once your workspace is ready."
                        : "This portal is restricted to verified Qatar University faculty members."}
                    </p>
                    {isFaculty && (
                      <button
                        type="button"
                        onClick={() => setView("studio")}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Continue to Document Studio
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}