"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Radio, CircleDot, FileText, Lightbulb, Layers, CheckCircle2 } from "lucide-react"

type Node = {
  id: string
  x: number
  y: number
  label: string
  type: "paper" | "prereq" | "gap"
}

const NODES: Node[] = [
  { id: "core", x: 50, y: 48, label: "Federated Edge Latency", type: "paper" },
  { id: "p1", x: 22, y: 22, label: "Adaptive Caching", type: "paper" },
  { id: "p2", x: 80, y: 26, label: "QoS Benchmarks", type: "paper" },
  { id: "pre1", x: 18, y: 70, label: "Network Theory", type: "prereq" },
  { id: "pre2", x: 48, y: 82, label: "Distributed Systems", type: "prereq" },
  { id: "gap1", x: 82, y: 70, label: "Research Gap: Energy ↔ Latency", type: "gap" },
  { id: "gap2", x: 72, y: 50, label: "Research Gap: Privacy Cost", type: "gap" },
]

const EDGES: [string, string][] = [
  ["core", "p1"],
  ["core", "p2"],
  ["core", "pre1"],
  ["core", "pre2"],
  ["core", "gap2"],
  ["p2", "gap1"],
  ["p1", "pre1"],
]

const LOGS = [
  { t: "00:12", q: true, text: "Define the dependent variable in your latency study." },
  { t: "00:34", q: false, text: "Normalized round-trip latency, measured per inference request." },
  { t: "01:05", q: true, text: "How did you control for device heterogeneity?" },
  { t: "01:28", q: false, text: "Stratified sampling across three cohorts; confirmed via ANOVA." },
]

function nodeColor(type: Node["type"]) {
  if (type === "paper") return { fill: "var(--color-primary)", text: "var(--color-primary-foreground)" }
  if (type === "prereq") return { fill: "var(--color-accent)", text: "var(--color-accent-foreground)" }
  return { fill: "var(--color-card)", text: "var(--color-foreground)" }
}

export function MethodologyGraph() {
  const [recording, setRecording] = useState(false)

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_340px] lg:p-5">
      {/* Canvas */}
      <section className="relative min-h-[72vh] overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold text-card-foreground">Relational Methodology Web</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Legend color="bg-primary" label="Paper" />
            <Legend color="bg-accent" label="Prerequisite" />
            <Legend color="border-2 border-dashed border-accent bg-card" label="Research gap" />
          </div>
        </div>

        <div className="relative h-[calc(72vh-3.25rem)] w-full bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [background-size:22px_22px]">
          {/* edges */}
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            {EDGES.map(([a, b], i) => {
              const na = NODES.find((n) => n.id === a)!
              const nb = NODES.find((n) => n.id === b)!
              return (
                <line
                  key={i}
                  x1={`${na.x}%`}
                  y1={`${na.y}%`}
                  x2={`${nb.x}%`}
                  y2={`${nb.y}%`}
                  stroke="var(--color-border)"
                  strokeWidth={2}
                />
              )
            })}
          </svg>

          {/* nodes */}
          {NODES.map((n) => {
            const isGap = n.type === "gap"
            const Icon = n.type === "paper" ? FileText : n.type === "prereq" ? Layers : Lightbulb
            return (
              <div
                key={n.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                <div
                  className={`flex max-w-[170px] items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium shadow-sm transition-transform hover:scale-105 ${
                    n.type === "paper"
                      ? "bg-primary text-primary-foreground"
                      : n.type === "prereq"
                        ? "bg-accent text-accent-foreground"
                        : "border-2 border-dashed border-accent bg-card text-foreground"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="leading-tight">{n.label}</span>
                </div>
                {isGap && (
                  <span className="absolute -right-1 -top-1 flex size-3">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex size-3 rounded-full bg-accent" />
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Socratic Audio (Viva Pod) */}
      <section className="flex min-h-[72vh] flex-col gap-4">
        <div className="rounded-xl border border-border bg-primary p-5 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-accent" aria-hidden="true" />
            <p className="text-sm font-semibold">Socratic Audio · Viva Pod</p>
          </div>
          <p className="mt-1 text-xs text-primary-foreground/70">Oral defense evaluation module</p>

          <div className="mt-5 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => setRecording((r) => !r)}
              className={`relative flex size-24 items-center justify-center rounded-full transition-colors ${
                recording ? "bg-accent text-accent-foreground" : "bg-primary-foreground/10 text-primary-foreground"
              }`}
              aria-pressed={recording}
              aria-label={recording ? "Stop recording" : "Start recording"}
            >
              {recording && (
                <span className="absolute inline-flex size-24 animate-ping rounded-full bg-accent opacity-30" />
              )}
              {recording ? <Mic className="size-9" /> : <MicOff className="size-9" />}
            </button>
            <div className="flex items-center gap-2 text-xs font-medium">
              <CircleDot className={`size-3.5 ${recording ? "text-accent" : "text-primary-foreground/40"}`} />
              {recording ? "Listening · 01:42" : "Microphone idle"}
            </div>
            {/* waveform */}
            <div className="flex h-10 items-center gap-1">
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full ${recording ? "bg-accent" : "bg-primary-foreground/20"}`}
                  style={{ height: `${recording ? 20 + Math.abs(Math.sin(i)) * 24 : 8}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold text-card-foreground">Oral Defense Evaluation Log</p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {LOGS.map((l, i) => (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">{l.t}</span>
                <p
                  className={`flex-1 rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    l.q
                      ? "bg-primary/10 font-medium text-primary"
                      : "border border-border bg-background text-foreground"
                  }`}
                >
                  {l.text}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-3">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Score Defense Response
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className={`size-3 rounded ${color}`} />
      {label}
    </span>
  )
}
