"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, type ViewKey } from "@/components/sidebar"
import { AccessGate } from "../components/access-gate"
import { DocumentStudio } from "@/components/document-studio"
import { MethodologyGraph } from "@/components/methodology-graph"
import { TeacherPortal } from "../components/teacher-portal"
import { Topbar } from "@/components/topbar"
import { researchDocumentsCrud } from "@/lib/crud"
import { supabase } from "@/lib/supabase"

type ResearchDocumentRow = {
  id: string
  owner_id: string
  title: string
  file_name: string | null
  file_url: string | null
  file_size_bytes: number | null
  page_count: number | null
  extracted_text: string | null
  keywords: string[]
  readability_score: number | null
  complexity_score: number | null
  methodology_latex: string | null
  created_at: string
  updated_at: string
}

type ProfileRow = {
  id: string
  full_name: string | null
  qu_email: string
  role: string | null
}

const normalizeRole = (role: string | null | undefined) => role?.trim().toLowerCase() ?? ""

const formatValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "—"
  }
  if (value === null || value === undefined || value === "") {
    return "—"
  }
  return String(value)
}

export default function Page() {
  const router = useRouter()
  const [view, setView] = useState<ViewKey>("access")
  const [authed, setAuthed] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileRole, setProfileRole] = useState<string | null>(null)
  const [documents, setDocuments] = useState<ResearchDocumentRow[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentsError, setDocumentsError] = useState("")
  
  const authUserIdRef = useRef<string | null>(null)
  const isFaculty = normalizeRole(profileRole) === "faculty"

  // Explicit, intentional global session reset modifier
  const resetWorkspaceState = () => {
    setAuthed(false)
    setProfileId(null)
    setProfileName(null)
    setProfileRole(null)
    setDocuments([])
    setDocumentsLoading(false)
    setDocumentsError("")
    setView("access")
  }

  // 1. Monitor Authentication Session Status and Profile Rows
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
            return nextRole === "faculty" ? "portal" : "studio"
          }
          return currentView
        })
      } catch (error) {
        if (isMounted) {
          resetWorkspaceState()
        }
      }
    }

    const initializeAuthState = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (user?.id) {
        await loadProfile(user.id)
      } else {
        resetWorkspaceState()
      }

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const nextUserId = session?.user?.id ?? null

        // 2. Clear out everything if user signs out or shifts context
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

  // 3. FIXED: Fetch active workspace records without triggering circular state cascades
  useEffect(() => {
    if (!authed || !profileId) {
      setDocuments([])
      return
    }

    let isMounted = true
    setDocumentsLoading(true)
    setDocumentsError("")

    const loadDocuments = async () => {
      try {
        const rows = (await researchDocumentsCrud.fetchAll()) as ResearchDocumentRow[]
        if (isMounted) {
          setDocuments(rows)
        }
      } catch (error: any) {
        if (isMounted) {
          setDocumentsError(error.message || "Failed to load active user documentation.")
        }
      } finally {
        if (isMounted) {
          setDocumentsLoading(false)
        }
      }
    }

    void loadDocuments()

    return () => {
      isMounted = false
    }
  }, [authed, profileId]) // 👈 Dependency array tied tightly to unique profile initialization primitives

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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1">
        {authed && (
          <Sidebar active={view} onNavigate={handleNavigate} authed={authed} canAccessPortal={isFaculty} name={profileName} role={profileRole} />
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
                  onAuthed={(role: "student" | "faculty" | "researcher") => {
                    setAuthed(true)
                    setProfileRole(role)
                    setView(role === "faculty" ? "portal" : "studio")
                  }}
                />
              )}
              {view === "studio" && <DocumentStudio />}
              {view === "graph" && <MethodologyGraph />}
              {view === "portal" && isFaculty && <TeacherPortal profileId={profileId} profileRole={profileRole} profileName={profileName} />}
              {view === "portal" && !isFaculty && (
                <div className="p-8 text-center text-destructive font-medium">
                  Access Denied: You do not have permission to view the evaluation workspace dashboard.
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Database Monitor Debug Footer Block */}
      <section className="border-t border-border bg-muted/30 px-6 py-5 text-sm">
        <div className="mx-auto max-w-5xl space-y-3">
          <div>
            <p className="font-medium">Supabase Integration Status</p>
            <p className="text-muted-foreground">
              Connected table endpoint: <span className="font-medium">research_documents</span>. Row extraction utilizes row level security tied to the logged in session.
            </p>
          </div>

          {!authed ? (
            <p className="text-muted-foreground italic">Please sign in to view active cloud data tables.</p>
          ) : documentsLoading ? (
            <p className="text-muted-foreground">Syncing cloud tables...</p>
          ) : documentsError ? (
            <p className="text-amber-600 font-medium">RLS Active Error: {documentsError}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-background">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="border-b border-border bg-muted/50 uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">id</th>
                    <th className="px-3 py-2">owner_id</th>
                    <th className="px-3 py-2">title</th>
                    <th className="px-3 py-2">file_name</th>
                    <th className="px-3 py-2">file_url</th>
                    <th className="px-3 py-2">file_size_bytes</th>
                    <th className="px-3 py-2">page_count</th>
                    <th className="px-3 py-2">extracted_text</th>
                    <th className="px-3 py-2">keywords</th>
                    <th className="px-3 py-2">readability_score</th>
                    <th className="px-3 py-2">complexity_score</th>
                    <th className="px-3 py-2">methodology_latex</th>
                    <th className="px-3 py-2">created_at</th>
                    <th className="px-3 py-2">updated_at</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-muted-foreground" colSpan={14}>
                        No rows found in research_documents for this account yet. Cloud data sync active.
                      </td>
                    </tr>
                  ) : (
                    documents.map((document) => (
                      <tr key={document.id} className="border-b border-border last:border-b-0 align-top">
                        <td className="px-3 py-2 font-medium">{formatValue(document.id)}</td>
                        <td className="px-3 py-2">{formatValue(document.owner_id)}</td>
                        <td className="px-3 py-2">{formatValue(document.title)}</td>
                        <td className="px-3 py-2">{formatValue(document.file_name)}</td>
                        <td className="px-3 py-2">{formatValue(document.file_url)}</td>
                        <td className="px-3 py-2">{formatValue(document.file_size_bytes)}</td>
                        <td className="px-3 py-2">{formatValue(document.page_count)}</td>
                        <td className="px-3 py-2 max-w-[20rem] truncate">{formatValue(document.extracted_text)}</td>
                        <td className="px-3 py-2">{formatValue(document.keywords)}</td>
                        <td className="px-3 py-2">{formatValue(document.readability_score)}</td>
                        <td className="px-3 py-2">{formatValue(document.complexity_score)}</td>
                        <td className="px-3 py-2 max-w-[20rem] truncate">{formatValue(document.methodology_latex)}</td>
                        <td className="px-3 py-2">{formatValue(document.created_at)}</td>
                        <td className="px-3 py-2">{formatValue(document.updated_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}