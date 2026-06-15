"use client"

import { useEffect, useState } from "react"
import { Sidebar, type ViewKey } from "@/components/sidebar"
import { AccessGate } from "@/components/access-gate"
import { DocumentStudio } from "@/components/document-studio"
import { MethodologyGraph } from "@/components/methodology-graph"
import { TeacherPortal } from "@/components/teacher-portal"
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
  const [view, setView] = useState<ViewKey>("access")
  const [authed, setAuthed] = useState(false)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileRole, setProfileRole] = useState<string | null>(null)
  const [profileRefreshKey, setProfileRefreshKey] = useState(0)
  const [documents, setDocuments] = useState<ResearchDocumentRow[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentsError, setDocumentsError] = useState("")

  const isTeacher = normalizeRole(profileRole) === "faculty" || normalizeRole(profileRole) === "researcher"

  // Monitor Authentication Session Status and Row Profiles
  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getUser()

        if (isMounted) {
          if (sessionError || !sessionData.user) {
            setAuthed(false)
            setProfileName(null)
            setProfileRole(null)
            setView("access")
            return
          }

          // Querying public.profiles using the exact schema columns
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", sessionData.user.id)
            .single()
          
          if (profileError || !profile) {
            // Fallback default setup if row profile hasn't fully loaded in database transaction yet
            setProfileName(sessionData.user.email?.split("@")[0] || "Scholar")
            setProfileRole("student") 
            setAuthed(true)
            setView("studio")
            return
          }

          const parsedProfile = profile as ProfileRow
          const nextRole = normalizeRole(parsedProfile.role)
          
          setProfileName(parsedProfile.full_name)
          setProfileRole(nextRole || "student")
          setAuthed(true)

          // FIXED: Direct institutional gates to matching views automatically on SUCCESSFUL profile fetch
          setView(nextRole === "faculty" || nextRole === "researcher" ? "portal" : "studio")
        }
      } catch (error) {
        if (isMounted) {
          setAuthed(false)
          setProfileName(null)
          setProfileRole(null)
          setView("access")
        }
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [profileRefreshKey])

  // Sync Documents live whenever authentication shifts
  useEffect(() => {
    if (!authed) {
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
  }, [authed, profileRefreshKey])

  const handleNavigate = (nextView: ViewKey) => {
    if (!authed) {
      setView("access")
      return
    }

    if (!isTeacher && nextView === "portal") {
      alert("Access Denied: The Faculty Evaluation Portal is restricted to teacher/researcher profiles.")
      return
    }

    setView(nextView)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1">
        {authed && (
          <Sidebar active={view} onNavigate={handleNavigate} authed={authed} canAccessPortal={isTeacher} />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            view={view}
            authed={authed}
            name={profileName || "Guest"}
            onSignOut={async () => {
              await supabase.auth.signOut()
              setAuthed(false)
              setProfileName(null)
              setProfileRole(null)
              setView("access")
            }}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden">
            <div key={view} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {view === "access" && (
                <AccessGate
                  onAuthed={(role) => {
                    setAuthed(true)
                    setProfileRole(role)
                    setView(role === "faculty" || role === "researcher" ? "portal" : "studio")
                    setProfileRefreshKey((current) => current + 1)
                  }}
                />
              )}
              {view === "studio" && <DocumentStudio />}
              {view === "graph" && <MethodologyGraph />}
              {view === "portal" && isTeacher && <TeacherPortal />}
              {view === "portal" && !isTeacher && (
                <div className="p-8 text-center text-destructive font-medium">
                  Access Denied: You do not have permission to view the evaluation workspace dashboard.
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Database Status Monitor Bar */}
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