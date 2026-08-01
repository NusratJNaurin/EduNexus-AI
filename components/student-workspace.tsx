"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, Building, CalendarDays, Clock, GraduationCap, Hash, User } from "lucide-react"
import { classSectionsCrud, profilesCrud, researchDocumentsCrud, sectionEnrollmentsCrud } from "@/lib/crud"
import { supabase } from "@/lib/supabase"
import type { ClassSectionRow, ProfileRow, ResearchDocumentRow, SectionEnrollmentRow } from "@/lib/types"

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function StatBadge({ label, value, icon }: { label: string; value: string; icon: React.ElementType }) {
  const Icon = icon
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2">
      <Icon className="size-4 shrink-0 text-primary/70" aria-hidden="true" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

function SectionCard({
  section,
  instructor,
  documents,
}: {
  section: ClassSectionRow
  instructor: ProfileRow | null
  documents: ResearchDocumentRow[]
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Section header — Maroon accent bar */}
      <div className="rounded-t-xl bg-gradient-to-r from-primary to-primary/80 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-primary-foreground" aria-hidden="true" />
            <h3 className="text-lg font-bold tracking-tight text-primary-foreground">
              {section.course_code}
            </h3>
          </div>
          <span className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
            Sec {section.section_number}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {/* Instructor row */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent-foreground">
            {instructor
              ? instructor.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "—"}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {instructor?.full_name || "Unknown instructor"}
            </p>
            <p className="text-xs text-muted-foreground">
              {instructor?.academic_domain || "Academic"}
              {instructor?.qu_email ? ` · ${instructor.qu_email}` : ""}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-2">
          <StatBadge label="Classwork" value={String(documents.length)} icon={BookOpen} />
          <StatBadge label="Created" value={formatDate(section.created_at)} icon={CalendarDays} />
          <StatBadge label="Invite" value={section.invite_code} icon={Hash} />
        </div>

        {/* Documents / classwork grid */}
        {documents.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Classwork Materials
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                >
                  <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                  {doc.file_name && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{doc.file_name}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    {doc.page_count != null && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="size-3" />
                        {doc.page_count} {doc.page_count === 1 ? "page" : "pages"}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {doc.updated_at ? formatDate(doc.updated_at) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/15 bg-primary/[0.02] py-8">
            {/* Classwork empty state */}
            <div style={{ animation: "floatScholar 5s ease-in-out infinite" }}>
              <svg
                width="64"
                height="56"
                viewBox="0 0 64 56"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
              >
                <rect x="8" y="14" width="20" height="26" rx="2" fill="var(--card)" stroke="currentColor" strokeWidth="1" strokeOpacity=".3" />
                <rect x="22" y="10" width="20" height="26" rx="2" fill="var(--card)" stroke="currentColor" strokeWidth="1" strokeOpacity=".4" />
                <rect x="36" y="16" width="20" height="26" rx="2" fill="var(--card)" stroke="var(--accent)" strokeWidth="1" strokeOpacity=".35" />
                <line x1="26" y1="18" x2="38" y2="18" stroke="currentColor" strokeWidth=".8" strokeOpacity=".3" />
                <line x1="26" y1="22" x2="36" y2="22" stroke="currentColor" strokeWidth=".8" strokeOpacity=".3" />
                <line x1="26" y1="26" x2="38" y2="26" stroke="currentColor" strokeWidth=".8" strokeOpacity=".3" />
                <circle cx="32" cy="46" r="6" fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeWidth=".8" strokeOpacity=".3" />
                <line x1="32" y1="43" x2="32" y2="49" stroke="currentColor" strokeWidth="1.2" strokeOpacity=".4" strokeLinecap="round" />
                <line x1="29" y1="46" x2="35" y2="46" stroke="currentColor" strokeWidth="1.2" strokeOpacity=".4" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-foreground">No classwork yet</p>
              <p className="text-muted-foreground" style={{ fontSize: 10, marginTop: 2 }}>
                No classwork materials have been shared yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <Building className="size-12 text-muted-foreground/40" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-semibold text-foreground">No sections yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Use the invite code from your instructor to join a class section. Enter it in the sidebar panel.
      </p>
    </div>
  )
}

export function StudentWorkspace() {
  const [sections, setSections] = useState<ClassSectionRow[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [documents, setDocuments] = useState<ResearchDocumentRow[]>([])
  const [enrollments, setEnrollments] = useState<SectionEnrollmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setLoading(true)

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!isMounted) return
        if (!user?.id) {
          setLoading(false)
          return
        }
        setUserId(user.id)

        const [enrollmentRows, sectionRows, profileRows, documentRows] = await Promise.all([
          sectionEnrollmentsCrud.fetchAll(),
          classSectionsCrud.fetchAll(),
          profilesCrud.fetchAll(),
          researchDocumentsCrud.fetchAll(),
        ])

        if (!isMounted) return

        setEnrollments(enrollmentRows)
        setSections(sectionRows)
        setProfiles(profileRows)
        setDocuments(documentRows)
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load student workspace data:", err)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void load()
    return () => { isMounted = false }
  }, [])

  // Compute the student's enrolled sections with instructor & documents
  const enrolledSections = useMemo(() => {
    if (!userId) return []

    const studentEnrollments = enrollments.filter((e) => e.student_id === userId)
    const enrolledIds = new Set(studentEnrollments.map((e) => e.section_id))

    return sections
      .filter((s) => enrolledIds.has(s.id))
      .map((section) => {
        const instructor = profiles.find((p) => p.id === section.instructor_id) ?? null
        const sectionDocs = documents.filter((d) => d.owner_id === section.instructor_id)
        return { section, instructor, documents: sectionDocs }
      })
  }, [userId, enrollments, sections, profiles, documents])

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Page header — QU-themed */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">My Sections</h1>
            <p className="text-sm text-muted-foreground">
              {enrolledSections.length > 0
                ? `You are enrolled in ${enrolledSections.length} ${enrolledSections.length === 1 ? "section" : "sections"}`
                : "View and access your enrolled class sections"}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
      ) : enrolledSections.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {enrolledSections.map(({ section, instructor, documents }) => (
            <SectionCard
              key={section.id}
              section={section}
              instructor={instructor}
              documents={documents}
            />
          ))}
        </div>
      )}
    </div>
  )
}