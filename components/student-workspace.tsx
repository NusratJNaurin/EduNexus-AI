"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, Clock, GraduationCap, Hash, Sparkles, User } from "lucide-react"
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
  memberCount,
}: {
  section: ClassSectionRow
  instructor: ProfileRow | null
  documents: ResearchDocumentRow[]
  memberCount: number
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
          <StatBadge label="Members" value={String(memberCount)} icon={User} />
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      {/* ── Main illustration ── */}
      <div className="relative" style={{ width: 260, height: 200 }}>

        {/* Floating orbiting cards — left */}
        <div className="absolute" style={{ left: 0, top: 32, animation: "floatPaper2 4s ease-in-out infinite" }}>
          <svg width="64" height="76" viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="76" rx="6" fill="white" stroke="#7b1d3a" strokeWidth="1" strokeOpacity=".18"/>
            <rect x="0" y="0" width="64" height="14" rx="6" fill="#7b1d3a" fillOpacity=".12"/>
            <rect x="0" y="6" width="64" height="8" rx="0" fill="#7b1d3a" fillOpacity=".06"/>
            <circle cx="10" cy="7" r="3" fill="#7b1d3a" fillOpacity=".3"/>
            <line x1="8" y1="22" x2="56" y2="22" stroke="#7b1d3a" strokeWidth=".7" strokeOpacity=".2"/>
            <line x1="8" y1="29" x2="50" y2="29" stroke="#7b1d3a" strokeWidth=".7" strokeOpacity=".2"/>
            <line x1="8" y1="36" x2="54" y2="36" stroke="#7b1d3a" strokeWidth=".7" strokeOpacity=".2"/>
            <line x1="8" y1="43" x2="46" y2="43" stroke="#7b1d3a" strokeWidth=".7" strokeOpacity=".2"/>
            <rect x="8" y="54" width="22" height="12" rx="3" fill="#3b82f6" fillOpacity=".2"/>
            <text x="19" y="63" textAnchor="middle" fontSize="7" fill="#3b82f6" fillOpacity=".7" fontWeight="600">BIO</text>
          </svg>
        </div>

        {/* Floating orbiting cards — right */}
        <div className="absolute" style={{ right: 0, top: 20, animation: "floatPaper1 3.6s ease-in-out infinite .3s" }}>
          <svg width="64" height="76" viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="76" rx="6" fill="white" stroke="#e05a3a" strokeWidth="1" strokeOpacity=".2"/>
            <rect x="0" y="0" width="64" height="14" rx="6" fill="#e05a3a" fillOpacity=".12"/>
            <rect x="0" y="6" width="64" height="8" fill="#e05a3a" fillOpacity=".05"/>
            <circle cx="10" cy="7" r="3" fill="#e05a3a" fillOpacity=".35"/>
            <line x1="8" y1="22" x2="56" y2="22" stroke="#e05a3a" strokeWidth=".7" strokeOpacity=".2"/>
            <line x1="8" y1="29" x2="48" y2="29" stroke="#e05a3a" strokeWidth=".7" strokeOpacity=".2"/>
            <line x1="8" y1="36" x2="52" y2="36" stroke="#e05a3a" strokeWidth=".7" strokeOpacity=".2"/>
            <line x1="8" y1="43" x2="44" y2="43" stroke="#e05a3a" strokeWidth=".7" strokeOpacity=".2"/>
            <rect x="8" y="54" width="26" height="12" rx="3" fill="#e05a3a" fillOpacity=".18"/>
            <text x="21" y="63" textAnchor="middle" fontSize="7" fill="#e05a3a" fillOpacity=".75" fontWeight="600">CHEM</text>
          </svg>
        </div>

        {/* Central scholar + door scene */}
        <div className="absolute" style={{ left: "50%", top: 10, transform: "translateX(-50%)", animation: "floatScholar 4.5s ease-in-out infinite" }}>
          <svg width="100" height="170" viewBox="0 0 100 170" xmlns="http://www.w3.org/2000/svg">

            {/* Arched doorway / portal */}
            <path d="M18 165 L18 80 Q18 44 50 44 Q82 44 82 80 L82 165 Z"
              fill="none" stroke="#7b1d3a" strokeWidth="2" strokeOpacity=".15"/>
            <path d="M24 165 L24 82 Q24 52 50 52 Q76 52 76 82 L76 165 Z"
              fill="rgba(123,29,58,0.04)" stroke="#7b1d3a" strokeWidth="1" strokeOpacity=".1"/>
            {/* Keystone */}
            <path d="M42 46 L50 38 L58 46 Z" fill="#7b1d3a" fillOpacity=".2"/>
            {/* Step */}
            <rect x="10" y="160" width="80" height="6" rx="1" fill="#7b1d3a" fillOpacity=".1"/>

            {/* Scholar body */}
            <rect x="36" y="110" width="28" height="38" rx="10" fill="#7b1d3a" fillOpacity=".2"/>
            {/* Gown/robe accent */}
            <path d="M36 125 Q50 132 64 125 L64 148 Q50 142 36 148 Z" fill="#7b1d3a" fillOpacity=".08"/>

            {/* Head */}
            <circle cx="50" cy="100" r="14" fill="#f5e6c8"/>
            {/* Graduation cap */}
            <rect x="36" y="90" width="28" height="5" rx="1" fill="#7b1d3a"/>
            <rect x="43" y="85" width="14" height="7" rx="1" fill="#7b1d3a"/>
            <line x1="64" y1="90" x2="69" y2="100" stroke="#7b1d3a" strokeWidth="1.4"/>
            <circle cx="69" cy="101" r="2.5" fill="#e05a3a"/>
            {/* Face */}
            <circle cx="45" cy="102" r="1.5" fill="#5a3020"/>
            <circle cx="55" cy="102" r="1.5" fill="#5a3020"/>
            <path d="M45 107 Q50 111 55 107" fill="none" stroke="#5a3020" strokeWidth="1.1" strokeLinecap="round"/>

            {/* Key in hand */}
            <line x1="64" y1="125" x2="78" y2="118" stroke="#7b1d3a" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="81" cy="116" r="4" fill="none" stroke="#e05a3a" strokeWidth="1.5" strokeOpacity=".7"/>
            <line x1="81" y1="120" x2="81" y2="126" stroke="#e05a3a" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="79" y1="123" x2="83" y2="123" stroke="#e05a3a" strokeWidth="1" strokeLinecap="round"/>

            {/* Floating sparkles around scholar */}
            <circle cx="22" cy="98" r="2" fill="#e05a3a" fillOpacity=".4"
              style={{ animation:"nodePulse 2s ease-in-out infinite" }}/>
            <circle cx="80" cy="88" r="1.5" fill="#3b82f6" fillOpacity=".5"
              style={{ animation:"nodePulse 2.4s ease-in-out infinite .4s" }}/>
            <circle cx="26" cy="115" r="1.2" fill="#10b981" fillOpacity=".5"
              style={{ animation:"nodePulse 2.8s ease-in-out infinite .8s" }}/>
          </svg>
        </div>

        {/* Dashed connector lines to the cards */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg">
          <line x1="74" y1="70" x2="120" y2="100" stroke="#7b1d3a" strokeWidth="1"
            strokeDasharray="4 3" strokeOpacity=".18"
            style={{ animation:"lineDash 2s linear infinite" }}/>
          <line x1="186" y1="60" x2="145" y2="95" stroke="#e05a3a" strokeWidth="1"
            strokeDasharray="4 3" strokeOpacity=".18"
            style={{ animation:"lineDash 2s linear infinite .5s" }}/>
        </svg>
      </div>

      {/* ── Text block ── */}
      <div className="text-center space-y-2 max-w-xs">
        <p className="font-bold text-sm" style={{ color: "#1a1a2e", letterSpacing: "-.01em" }}>
          No sections yet
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "#717182" }}>
          Use the invite code from your instructor to join a class section. Enter it in the sidebar panel.
        </p>
      </div>

      {/* ── Step hints ── */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {[
          { n:"1", label:"Get an invite code from your instructor", color:"#3b82f6", bg:"rgba(59,130,246,.08)" },
          { n:"2", label:"Enter it in the sidebar 'JOIN CLASS WITH CODE' panel", color:"#7b1d3a", bg:"rgba(123,29,58,.07)" },
          { n:"3", label:"Your class materials appear here instantly", color:"#10b981", bg:"rgba(16,185,129,.08)" },
        ].map(step => (
          <div key={step.n} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
            style={{ background: step.bg, border:`1px solid ${step.color}22` }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-white"
              style={{ background: step.color, fontSize: 10 }}>{step.n}</span>
            <p className="text-xs" style={{ color: "#4a3a3a" }}>{step.label}</p>
          </div>
        ))}
      </div>

      {/* ── CTA pill ── */}
      <div className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold"
        style={{ background:"rgba(123,29,58,.07)", color:"#7b1d3a", border:"1px solid rgba(123,29,58,.14)" }}>
        <Sparkles size={11}/>
        <span>Waiting to unlock your first section</span>
      </div>
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
        const memberCount = enrollments.filter((e) => e.section_id === section.id).length
        return { section, instructor, documents: sectionDocs, memberCount }
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
          {enrolledSections.map(({ section, instructor, documents, memberCount }) => (
            <SectionCard
              key={section.id}
              section={section}
              instructor={instructor}
              documents={documents}
              memberCount={memberCount}
            />
          ))}
        </div>
      )}
    </div>
  )
}