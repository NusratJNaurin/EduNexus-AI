"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Clock,
  FileJson,
  FileSpreadsheet,
  Link2,
  Plus,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react"
import { classSectionsCrud, profilesCrud, researchDocumentsCrud, sectionEnrollmentsCrud } from "@/lib/crud"
import type {
  ClassSectionRow,
  ProfileRow,
  ResearchDocumentRow,
  SectionEnrollmentRow,
} from "@/lib/types"
import { normalizeRole } from "@/lib/types"

type StudentCardRow = {
  id: string
  name: string
  email: string
  sections: string
  sessions: number
  lastActive: string
  read: string
  engagement: number
  engagementLabel: string
  status: string
  badgeClass: string
  progressClass: string
  documents: ResearchDocumentRow[]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function buildInviteCode(courseCode: string, sectionNumber: string) {
  const coursePart = courseCode.trim().toUpperCase().replace(/\s+/g, "-")
  const sectionPart = sectionNumber.trim().toUpperCase().replace(/\s+/g, "-")
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${coursePart}-${sectionPart}-${suffix}`
}

function estimateDocumentMinutes(document: ResearchDocumentRow) {
  if (document.page_count && document.page_count > 0) {
    return document.page_count * 4
  }

  if (document.file_size_bytes && document.file_size_bytes > 0) {
    return Math.max(1, Math.round(document.file_size_bytes / 250000))
  }

  return 0
}

function formatDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60
  return `${hours}h ${remainder}m`
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not started"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function escapeCsvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: typeof Users
}) {
  const Icon = icon

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-accent-foreground/70" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-card-foreground">{value}</p>
    </div>
  )
}

export function TeacherPortal({
  profileId,
  profileRole,
  profileName,
}: {
  profileId: string | null
  profileRole: string | null
  profileName: string | null
}) {
  const [sections, setSections] = useState<ClassSectionRow[]>([])
  const [activeSectionId, setActiveSectionId] = useState("")
  const [newCourseCode, setNewCourseCode] = useState("")
  const [newSectionNumber, setNewSectionNumber] = useState("")
  const [inviteCodeDraft, setInviteCodeDraft] = useState("")
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [documents, setDocuments] = useState<ResearchDocumentRow[]>([])
  const [enrollments, setEnrollments] = useState<SectionEnrollmentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isFaculty = normalizeRole(profileRole) === "faculty"

  useEffect(() => {
    if (!isFaculty || !profileId) {
      setSections([])
      setActiveSectionId("")
      setProfiles([])
      setDocuments([])
      setEnrollments([])
      return
    }

    let isMounted = true

    const loadLiveData = async () => {
      setLoading(true)
      setError("")

      try {
        const [sectionRows, profileRows, documentRows, enrollmentRows] = await Promise.all([
          classSectionsCrud.fetchAll(),
          profilesCrud.fetchAll(),
          researchDocumentsCrud.fetchAll(),
          sectionEnrollmentsCrud.fetchAll(),
        ])

        if (!isMounted) {
          return
        }

        const mappedSections = sectionRows
          .filter((section) => section.instructor_id === profileId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))

        setSections(mappedSections)
        setProfiles(profileRows)
        setDocuments(documentRows)
        setEnrollments(enrollmentRows)
        setActiveSectionId((current) => (mappedSections.some((section) => section.id === current) ? current : mappedSections[0]?.id ?? ""))
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : "Failed to load the live faculty workspace."
          setError(message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadLiveData()

    return () => {
      isMounted = false
    }
  }, [isFaculty, profileId])

  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null

  const activeSectionStudentIds = useMemo(() => {
    if (!activeSection) {
      return new Set<string>()
    }

    return new Set(
      enrollments.filter((enrollment) => enrollment.section_id === activeSection.id).map((enrollment) => enrollment.student_id),
    )
  }, [activeSection, enrollments])

  const studentCards = useMemo<StudentCardRow[]>(() => {
    if (!activeSection) {
      return []
    }

    const sectionStudents = profiles.filter((profile) => normalizeRole(profile.role) === "student" && activeSectionStudentIds.has(profile.id))

    return sectionStudents.map((student) => {
      const studentDocuments = documents.filter((document) => document.owner_id === student.id)
      const totalReadingMinutes = studentDocuments.reduce((sum, document) => sum + estimateDocumentMinutes(document), 0)
      const latestDocument = studentDocuments.reduce<ResearchDocumentRow | null>((latest, document) => {
        if (!latest) {
          return document
        }

        return new Date(document.updated_at).getTime() > new Date(latest.updated_at).getTime() ? document : latest
      }, null)

      if (studentDocuments.length === 0) {
        return {
          id: student.id,
          name: student.full_name || "Academic User",
          email: student.qu_email,
          sections: `${activeSection.course_code} · Sec ${activeSection.section_number}`,
          sessions: 0,
          lastActive: "Not started",
          read: "0h 0m",
          engagement: 0,
          engagementLabel: "0% / Not Started Yet",
          status: "Not Started",
          badgeClass: "bg-muted text-muted-foreground",
          progressClass: "bg-muted",
          documents: studentDocuments,
        }
      }

      const averageReadability = studentDocuments.reduce((sum, document) => sum + (document.readability_score ?? 0), 0) / studentDocuments.length
      const averageComplexity = studentDocuments.reduce((sum, document) => sum + (document.complexity_score ?? 0), 0) / studentDocuments.length
      const recencyBonus = latestDocument && new Date(latestDocument.updated_at).getTime() > Date.now() - 1000 * 60 * 60 * 24 * 7 ? 10 : 0
      const engagement = clamp(
        Math.round(
          studentDocuments.length * 18 +
            Math.max(0, 24 - averageComplexity) +
            Math.max(0, 14 - averageReadability / 6) +
            recencyBonus,
        ),
        1,
        100,
      )

      return {
        id: student.id,
        name: student.full_name || "Academic User",
        email: student.qu_email,
        sections: `${activeSection.course_code} · Sec ${activeSection.section_number}`,
        sessions: studentDocuments.length,
        lastActive: formatTimestamp(latestDocument?.updated_at ?? latestDocument?.created_at),
        read: formatDuration(totalReadingMinutes),
        engagement,
        engagementLabel: `${engagement}%`,
        status: engagement >= 70 ? "Active" : engagement >= 45 ? "Monitoring" : "At risk",
        badgeClass:
          engagement >= 70
            ? "bg-primary/10 text-primary"
            : engagement >= 45
              ? "bg-amber-500/10 text-amber-700"
              : "bg-destructive/10 text-destructive",
        progressClass: engagement >= 70 ? "bg-primary" : engagement >= 45 ? "bg-amber-500" : "bg-destructive",
        documents: studentDocuments,
      }
    })
  }, [activeSection, activeSectionStudentIds, documents, profiles])

  const metrics = useMemo(() => {
    const activeStudents = studentCards.length
    const totalTrackedDocs = studentCards.reduce((sum, student) => sum + student.documents.length, 0)
    const totalReadingMinutes = studentCards.reduce((sum, student) => {
      return sum + student.documents.reduce((docSum, document) => docSum + estimateDocumentMinutes(document), 0)
    }, 0)
    const totalEngagement = studentCards.reduce((sum, student) => sum + student.engagement, 0)

    return {
      activeStudents,
      avgReadingTime: activeStudents ? Math.round(totalReadingMinutes / activeStudents) : 0,
      avgEngagement: activeStudents ? Math.round(totalEngagement / activeStudents) : 0,
      documentsTracked: totalTrackedDocs,
    }
  }, [studentCards])

  const sectionLabel = activeSection ? `${activeSection.course_code} · Sec ${activeSection.section_number}` : "No active section"

  const handleExportCsv = () => {
    if (studentCards.length === 0) {
      setError("No student records are available to export.")
      return
    }

    const headers = ["Name", "Email", "Section", "Sessions", "Last Active", "Active Reading", "Engagement", "Status"]
    const rows = studentCards.map((student) => [
      student.name,
      student.email,
      student.sections,
      student.sessions,
      student.lastActive,
      student.read,
      student.engagementLabel,
      student.status,
    ])

    const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n")
    const filename = `edunexus-performance-${activeSection?.course_code ?? "section"}-${new Date().toISOString().slice(0, 10)}.csv`
    downloadFile(filename, csv, "text/csv;charset=utf-8")
  }

  const handleExportJson = () => {
    const auditTrail = {
      exportedAt: new Date().toISOString(),
      instructor: profileName,
      section: activeSection,
      metrics,
      students: studentCards.map((student) => ({
        id: student.id,
        name: student.name,
        email: student.email,
        sections: student.sections,
        sessions: student.sessions,
        lastActive: student.lastActive,
        read: student.read,
        engagement: student.engagement,
        status: student.status,
        documents: student.documents.map((document) => ({
          id: document.id,
          title: document.title,
          pageCount: document.page_count,
          readabilityScore: document.readability_score,
          complexityScore: document.complexity_score,
          updatedAt: document.updated_at,
        })),
      })),
    }

    const filename = `edunexus-audit-${activeSection?.course_code ?? "section"}-${new Date().toISOString().slice(0, 10)}.json`
    downloadFile(filename, JSON.stringify(auditTrail, null, 2), "application/json")
  }

  const handleGenerateInviteCode = () => {
    if (!newCourseCode.trim() || !newSectionNumber.trim()) {
      setError("Enter both a course code and section number before generating an invite code.")
      return
    }

    setError("")
    setInviteCodeDraft(buildInviteCode(newCourseCode, newSectionNumber))
  }

  const handleCreateSection = async () => {
    if (!isFaculty || !profileId) {
      return
    }

    const courseCode = newCourseCode.trim().toUpperCase()
    const sectionNumber = newSectionNumber.trim().toUpperCase()

    if (!courseCode || !sectionNumber) {
      setError("A course code and section number are required to create a section.")
      return
    }

    const inviteCode = inviteCodeDraft || buildInviteCode(courseCode, sectionNumber)

    try {
      setLoading(true)
      setError("")

      const createdSection = await classSectionsCrud.insertRecord({
        instructor_id: profileId,
        course_code: courseCode,
        section_number: sectionNumber,
        invite_code: inviteCode,
      })

      setSections((current) => [createdSection, ...current.filter((section) => section.id !== createdSection.id)])
      setActiveSectionId(createdSection.id)
      setInviteCodeDraft(inviteCode)
      setNewCourseCode("")
      setNewSectionNumber("")
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Could not create the section."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!isFaculty) {
    return (
      <div className="space-y-4 p-4 lg:p-5">
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldAlert className="size-4 text-destructive" aria-hidden="true" />
            <p className="font-semibold">Faculty-only evaluation workspace</p>
          </div>
          <p className="mt-2">This portal is hidden from student and researcher accounts.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 lg:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active students" value={String(metrics.activeStudents)} icon={Users} />
        <StatCard label="Avg. reading time" value={formatDuration(metrics.avgReadingTime)} icon={Clock} />
        <StatCard label="Avg. engagement" value={`${metrics.avgEngagement}%`} icon={TrendingUp} />
        <StatCard label="Documents tracked" value={String(metrics.documentsTracked)} icon={BookOpen} />
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold text-card-foreground">Engagement Audit · {profileName || "Faculty Workspace"}</p>
            <p className="text-xs text-muted-foreground">Invite-only section control and live cohort analytics</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
              Active section: {sectionLabel}
            </span>
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
              Instructor: {profileName || "Unknown"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {sections.length === 0 ? (
              <span className="text-xs text-muted-foreground">No sections yet. Create the first invite-only cohort below.</span>
            ) : (
              sections.map((section) => {
                const isActive = section.id === activeSectionId
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {section.course_code} · Sec {section.section_number}
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="flex w-full max-w-xl flex-col gap-3 rounded-xl border border-border bg-background p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Course code</span>
              <input
                value={newCourseCode}
                onChange={(event) => setNewCourseCode(event.target.value)}
                placeholder="e.g. COMP-402"
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Section number</span>
              <input
                value={newSectionNumber}
                onChange={(event) => setNewSectionNumber(event.target.value)}
                placeholder="e.g. A1"
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="gap-2 border-accent text-accent-foreground" onClick={handleGenerateInviteCode}>
              <Link2 className="size-4" />
              Generate invite code
            </Button>
            <Button type="button" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCreateSection} disabled={loading}>
              <Plus className="size-4" />
              Create section
            </Button>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Invite code: <span className="font-mono font-semibold text-foreground">{inviteCodeDraft || "Generate a code to share with students"}</span>
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-card-foreground">Live section roster</p>
            <p className="text-xs text-muted-foreground">Students are pulled from live profiles and paired with uploaded documents by owner_id.</p>
          </div>
          {loading && <p className="text-xs text-muted-foreground">Refreshing live data...</p>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Section</th>
                <th className="px-4 py-3 font-semibold">Sessions</th>
                <th className="px-4 py-3 font-semibold">Last active</th>
                <th className="px-4 py-3 font-semibold">Active reading</th>
                <th className="px-4 py-3 font-semibold">Engagement</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {!activeSection ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                    Create or select a section to inspect its live roster.
                  </td>
                </tr>
              ) : studentCards.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                    No enrolled students are linked to {sectionLabel} yet.
                  </td>
                </tr>
              ) : (
                studentCards.map((student) => (
                  <tr key={student.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-foreground">{student.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{student.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{student.sections}</td>
                    <td className="px-4 py-3 text-muted-foreground">{student.sessions}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{student.lastActive}</td>
                    <td className="px-4 py-3 text-muted-foreground">{student.read}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${student.progressClass}`} style={{ width: `${student.engagement}%` }} />
                        </div>
                        <span className="font-mono text-xs text-foreground">{student.engagementLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${student.badgeClass}`}>
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-card-foreground">Export and audit controls</p>
          <p className="text-xs text-muted-foreground">Faculty analytics remain grounded in the live Supabase roster.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={handleExportCsv}
            disabled={studentCards.length === 0}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <FileSpreadsheet className="size-4" />
            Export Performance Matrix (CSV)
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleExportJson}
            disabled={studentCards.length === 0}
            className="gap-2 border-accent text-accent-foreground"
          >
            <FileJson className="size-4" />
            Export JSON Audit Trail
          </Button>
        </div>
      </div>
    </div>
  )
}
