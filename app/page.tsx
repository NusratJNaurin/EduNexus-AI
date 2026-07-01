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
import type { ProfileRow } from "@/lib/types"

export default function Page() {
  const router = useRouter()
  const [view, setView] = useState<ViewKey>("access")
  const [authed, setAuthed] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileRole, setProfileRole] = useState<string | null>(null)

  const authUserIdRef = useRef<string | null>(null)

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

        setProfileId(parsedProfile.id)
        setProfileName(parsedProfile.full_name)
        setProfileRole(parsedProfile.role)
        setAuthed(true)

        setView((currentView) => {
          if (currentView === "access") return "studio"
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
    setView(nextView)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1">
        {authed && (
          <Sidebar
            active={view}
            onNavigate={handleNavigate}
            authed={authed}
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
          <main className="min-w-0 flex-1 overflow-x-hidden">
            <div key={view} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {view === "access" && (
            <AccessGate
              onAuthed={async () => {
                setAuthed(true)

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
                      setProfileRole(parsed.role)
                    }
                  }
                } catch {
                  // Non-critical; profile will be fetched by onAuthStateChange eventually
                }

                setView("studio")
              }}
            />
          )}
              {view === "sections" && <StudentWorkspace />}
              {view === "studio" && <DocumentStudio />}
              {view === "graph" && <MethodologyGraph />}
              {view === "portal" && (
                <TeacherPortal profileId={profileId} profileRole={profileRole} profileName={profileName} />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}