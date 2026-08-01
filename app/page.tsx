"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
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

export default function Page() {
  const router = useRouter()
  const [view, setView] = useState<ViewKey>("access")
  const [authed, setAuthed] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileRole, setProfileRole] = useState<UserRole | null>(null)

  const authUserIdRef = useRef<string | null>(null)
  const isFaculty = normalizeRole(profileRole) === "faculty"

  const resetWorkspaceState = () => {
    setAuthed(false)
    setProfileId(null)
    setProfileName(null)
    setProfileRole(null)
    setView("access")
  }

  useEffect(() => {
    let isMounted = true
    let authSubscription: { unsubscribe: () => void } | null = null

    const loadProfile = async (userId: string) => {
      try {
        authUserIdRef.current = userId

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle()

        if (!isMounted) return

        if (profileError || !profile) {
          resetWorkspaceState()
          return
        }

        const parsedProfile = profile as ProfileRow
        const nextRole = normalizeRole(parsedProfile.role)

        setProfileId(parsedProfile.id)
        setProfileName(parsedProfile.full_name)
        setProfileRole(nextRole || "student")
        setAuthed(true)

        setView((currentView) => {
          if (currentView === "access") {
            if (nextRole === "faculty") return "portal"
            if (nextRole === "student") return "sections"
            return "studio"
          }
          return currentView
        })
      } catch {
        if (isMounted) {
          resetWorkspaceState()
        }
      }
    }

    const initializeAuthState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.id) {
        await loadProfile(user.id)
      } else {
        resetWorkspaceState()
      }

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const nextUserId = session?.user?.id ?? null

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
  }, [router])

  const handleNavigate = (nextView: ViewKey) => {
    if (!authed) {
      setView("access")
      return
    }

    if (!isFaculty && nextView === "portal") {
      alert("Access Denied: The Faculty Evaluation Portal is restricted to faculty profiles.")
      return
    }

    setView(nextView)
  }

  return (
<div className="flex h-screen flex-col bg-background text-foreground">
<div className="flex min-h-0 flex-1">
        {authed && (
          <Sidebar
            active={view}
            onNavigate={handleNavigate}
            authed={authed}
            canAccessPortal={isFaculty}
            name={profileName}
            role={profileRole}
          />
        )}
<div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            view={view}
            authed={authed}
            name={profileName || "Guest"}
            onSignOut={async () => {
              await supabase.auth.signOut()
              resetWorkspaceState()
              router.refresh()
            }}
          />
<main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
            {/* Subtle background texture — only visible in the white gaps between panels */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: 0.025 }} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="workspaceMash" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="8" fill="none" stroke="#8A1538" strokeWidth="1" />
                  <line x1="20" y1="4" x2="20" y2="36" stroke="#8A1538" strokeWidth="0.6" />
                  <line x1="4" y1="20" x2="36" y2="20" stroke="#8A1538" strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#workspaceMash)" />
            </svg>
            <div key={view} className="relative z-10 flex min-h-0 flex-1 flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
          {view === "access" && (
            <AccessGate
              onAuthed={async (role: UserRole) => {
                setAuthed(true)
                setProfileRole(role)

                // Immediately fetch the user's profile to set profileId / profileName
                // so that downstream components like TeacherPortal have them available
                // right away, rather than waiting for the async auth subscription.
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
                  // Non-critical; profile will be fetched by onAuthStateChange eventually
                }

                setView(role === "faculty" ? "portal" : role === "student" ? "sections" : "studio")
              }}
            />
          )}
              {view === "sections" && <StudentWorkspace />}
              {view === "studio" && <DocumentStudio />}
              {view === "graph" && <MethodologyGraph />}
              {view === "portal" && isFaculty && (
                <TeacherPortal profileId={profileId} profileRole={profileRole} profileName={profileName} />
              )}
              {view === "portal" && !isFaculty && (
                <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center text-destructive font-medium">
                  Access Denied: You do not have permission to view the evaluation workspace dashboard.
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}