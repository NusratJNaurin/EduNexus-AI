"use client"

import { Button } from "@/components/ui/button"
import { FileSpreadsheet, FileJson, TrendingUp, Clock, Users, BookOpen } from "lucide-react"

const STUDENTS = [
  { name: "Mariam Al-Kuwari", id: "QU-201845", sessions: 24, lastActive: "2026-06-08 09:14", read: "3h 42m", engagement: 92, status: "Active" },
  { name: "Yousef Al-Naimi", id: "QU-209113", sessions: 18, lastActive: "2026-06-07 21:03", read: "2h 58m", engagement: 78, status: "Active" },
  { name: "Fatima Al-Sulaiti", id: "QU-198722", sessions: 31, lastActive: "2026-06-08 08:01", read: "5h 11m", engagement: 96, status: "Active" },
  { name: "Omar Al-Marri", id: "QU-211004", sessions: 9, lastActive: "2026-06-05 16:47", read: "1h 12m", engagement: 41, status: "At risk" },
  { name: "Noora Al-Thani", id: "QU-205518", sessions: 21, lastActive: "2026-06-08 07:30", read: "3h 05m", engagement: 84, status: "Active" },
  { name: "Hamad Al-Emadi", id: "QU-207630", sessions: 6, lastActive: "2026-06-02 14:20", read: "0h 48m", engagement: 28, status: "At risk" },
]

const STATS = [
  { label: "Active students", value: "48", icon: Users },
  { label: "Avg. reading time", value: "3h 12m", icon: Clock },
  { label: "Avg. engagement", value: "79%", icon: TrendingUp },
  { label: "Documents tracked", value: "126", icon: BookOpen },
]

export function TeacherPortal() {
  return (
    <div className="space-y-4 p-4 lg:p-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <Icon className="size-4 text-accent-foreground/70" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-card-foreground">{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Export actions */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-card-foreground">Engagement Audit · Computer Engineering</p>
          <p className="text-xs text-muted-foreground">Private cohort analytics — instructor access only</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <FileSpreadsheet className="size-4" />
            Export Performance Matrix (CSV)
          </Button>
          <Button variant="outline" className="gap-2 border-accent text-accent-foreground">
            <FileJson className="size-4" />
            Export JSON Audit Trail
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Sessions</th>
                <th className="px-4 py-3 font-semibold">Last active</th>
                <th className="px-4 py-3 font-semibold">Active reading</th>
                <th className="px-4 py-3 font-semibold">Engagement</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{s.id}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.sessions}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.lastActive}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.read}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${s.engagement}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-foreground">{s.engagement}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        s.status === "Active"
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
