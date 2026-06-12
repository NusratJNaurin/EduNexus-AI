"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Search,
  FileText,
  Filter,
  Highlighter,
  Send,
  Sparkles,
  Quote,
} from "lucide-react"

const FILES = [
  { name: "Edge-Cloud Latency in Federated Learning.pdf", active: true, pages: 18 },
  { name: "Adaptive Caching Strategies (2025).pdf", active: false, pages: 24 },
  { name: "QoS Benchmarks for IoT Gateways.pdf", active: false, pages: 12 },
]

const PARAGRAPHS = [
  "We investigate the trade-off between computational offloading and perceived responsiveness in federated edge deployments across the Qatar University campus network.",
  "Across 1,204 sampled inference requests, edge-resident execution reduced round-trip latency substantially relative to centralized cloud invocation, with the largest gains observed under congested uplink conditions.",
  "The normalized latency reduction metric, defined below, isolates the proportional benefit of edge placement independent of absolute network speed.",
  "Statistical significance was confirmed across all three experimental cohorts (p < 0.01), suggesting the effect is robust to participant device heterogeneity.",
]

const CHAT = [
  {
    role: "user" as const,
    text: "What was the measured latency improvement and was it statistically significant?",
  },
  {
    role: "ai" as const,
    text: "Edge execution reduced mean round-trip latency by 41.3%, most pronounced under congested uplinks. The effect was statistically significant across all three cohorts.",
    cites: [
      { tag: "p.6 §3.2", note: "“edge-resident execution reduced round-trip latency substantially”" },
      { tag: "p.7 Table 2", note: "p < 0.01 across cohorts A, B, C" },
    ],
  },
]

export function DocumentStudio() {
  const [input, setInput] = useState("")
  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 lg:p-5">
      {/* LEFT: PDF viewer */}
      <section className="flex min-h-[70vh] flex-col rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <input
              placeholder="Search keywords in document..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="size-4" />
            Filter
          </Button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-muted/40 p-2">
          {FILES.map((f) => (
            <button
              key={f.name}
              type="button"
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                f.active
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-3.5" aria-hidden="true" />
              <span className="max-w-[140px] truncate">{f.name}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground/70">
              Extracted Text Stream · Page 6
            </p>
            <h3 className="mb-4 text-balance text-lg font-semibold text-foreground">
              Quantifying Edge Placement Benefits in Federated Inference
            </h3>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {PARAGRAPHS.map((p, i) => (
                <p key={i}>
                  {i === 1 ? (
                    <>
                      Across 1,204 sampled inference requests,{" "}
                      <mark className="rounded bg-accent/30 px-1 text-foreground">
                        edge-resident execution reduced round-trip latency substantially
                      </mark>{" "}
                      relative to centralized cloud invocation, with the largest gains observed under
                      congested uplink conditions.
                    </>
                  ) : (
                    p
                  )}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT: metrics + formula + chat */}
      <section className="flex min-h-[70vh] flex-col gap-4">
        {/* Metric matrix */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-card-foreground">Single-File Metric Matrix</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Sample size", "n = 1,204"],
              ["p-value", "p < 0.01"],
              ["Effect (Δ)", "−41.3%"],
              ["Cohorts", "3"],
              ["CI 95%", "±2.7%"],
              ["Power", "0.92"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] text-muted-foreground">{l}</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* LaTeX formula */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-semibold text-card-foreground">Normalized Latency Reduction</p>
          <pre className="overflow-x-auto rounded-lg bg-primary p-4 font-mono text-sm text-primary-foreground">
            <code>Latency = (T_cloud - T_edge) / T_cloud</code>
          </pre>
        </div>

        {/* Chat studio */}
        <div className="flex min-h-[320px] flex-1 flex-col rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold text-card-foreground">Source-Grounded Interaction Chat Studio</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {CHAT.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {m.text}
                  </p>
                </div>
              ) : (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Sparkles className="size-3.5" aria-hidden="true" />
                    </div>
                    <p className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-background px-4 py-2.5 text-sm leading-relaxed text-foreground">
                      {m.text}
                    </p>
                  </div>
                  <div className="ml-9 space-y-1.5">
                    {m.cites?.map((c) => (
                      <div
                        key={c.tag}
                        className="flex items-start gap-2 rounded-lg border-l-2 border-accent bg-accent/10 px-3 py-2 text-xs"
                      >
                        <Quote className="mt-0.5 size-3.5 shrink-0 text-accent-foreground/70" aria-hidden="true" />
                        <span className="text-muted-foreground">
                          <span className="font-mono font-semibold text-primary">{c.tag}</span> — {c.note}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setInput("")
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <Highlighter className="size-4 text-muted-foreground" aria-hidden="true" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a source-grounded question..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Send className="size-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
