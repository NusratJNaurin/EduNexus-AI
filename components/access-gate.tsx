"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, GraduationCap, Lock, Mail, ShieldCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Lora } from "next/font/google"

const loraDisplay = Lora({ subsets: ["latin"], display: "swap" })

const ROLES = ["Student", "Faculty", "Researcher"] as const
const DOMAINS = [
  "Computer Engineering",
  "Electrical Engineering",
  "Medicine",
  "Pharmacy",
  "Civil & Architectural Eng.",
  "Data Science",
]

type AuthRole = "student" | "faculty" | "researcher"

/* ------------------------------------------------------------------ */
/*  Mashrabiya lattice + citation graph overlay (inline SVG)          */
/* ------------------------------------------------------------------ */
function BrandGraphic() {
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="mashrabiya" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <rect width="80" height="80" fill="none" stroke="#C5A059" strokeWidth="0.6" opacity="0.15" />
          <rect x="11.7" y="11.7" width="56.6" height="56.6" fill="none" stroke="#C5A059" strokeWidth="0.6" opacity="0.15" transform="rotate(45 40 40)" />
          <line x1="0" y1="0" x2="80" y2="80" stroke="#C5A059" strokeWidth="0.3" opacity="0.08" />
          <line x1="80" y1="0" x2="0" y2="80" stroke="#C5A059" strokeWidth="0.3" opacity="0.08" />
          <line x1="40" y1="0" x2="40" y2="80" stroke="#C5A059" strokeWidth="0.3" opacity="0.08" />
          <line x1="0" y1="40" x2="80" y2="40" stroke="#C5A059" strokeWidth="0.3" opacity="0.08" />
        </pattern>
      </defs>

      {/* Lattice background */}
      <rect width="100%" height="100%" fill="url(#mashrabiya)" />

      {/* Cluster 1 — sparse upper-left */}
      <g stroke="#C5A059" fill="none" opacity="0.35" strokeWidth="0.8">
        <line x1="180" y1="110" x2="300" y2="150" />
        <line x1="300" y1="150" x2="260" y2="250" />
        <line x1="180" y1="110" x2="260" y2="250" opacity="0.15" strokeWidth="0.5" />
      </g>

      {/* Cluster 2 — dense upper-center-right (active research hub) */}
      <g stroke="#C5A059" fill="none" opacity="0.4" strokeWidth="0.9">
        <line x1="460" y1="90" x2="540" y2="180" />
        <line x1="540" y1="180" x2="500" y2="300" />
        <line x1="540" y1="180" x2="660" y2="160" />
        <line x1="460" y1="90" x2="660" y2="160" opacity="0.15" strokeWidth="0.5" />
        <line x1="500" y1="300" x2="660" y2="160" opacity="0.15" strokeWidth="0.5" />
      </g>

      {/* Cluster 3 — lower (emerging connections) */}
      <g stroke="#C5A059" fill="none" opacity="0.3" strokeWidth="0.7">
        <line x1="130" y1="370" x2="240" y2="430" />
        <line x1="240" y1="430" x2="360" y2="390" />
        <line x1="240" y1="430" x2="210" y2="520" />
        <line x1="360" y1="390" x2="460" y2="470" />
        <line x1="210" y1="520" x2="460" y2="470" opacity="0.12" strokeWidth="0.4" />
      </g>

      {/* Primary nodes (glowing) */}
      <circle cx="180" cy="110" r="3.5" fill="#C5A059" opacity="0.7" filter="url(#glow)" />
      <circle cx="460" cy="90" r="4" fill="#F8F6F0" opacity="0.75" filter="url(#glow)" />
      <circle cx="540" cy="180" r="4.5" fill="#C5A059" opacity="0.85" filter="url(#glow)" />
      <circle cx="240" cy="430" r="4" fill="#C5A059" opacity="0.7" filter="url(#glow)" />

      {/* Secondary nodes */}
      <circle cx="300" cy="150" r="2.5" fill="#F8F6F0" opacity="0.5" />
      <circle cx="260" cy="250" r="2" fill="#C5A059" opacity="0.45" />
      <circle cx="660" cy="160" r="3" fill="#C5A059" opacity="0.55" />
      <circle cx="500" cy="300" r="2" fill="#F8F6F0" opacity="0.4" />
      <circle cx="130" cy="370" r="2.5" fill="#C5A059" opacity="0.5" />
      <circle cx="360" cy="390" r="2" fill="#C5A059" opacity="0.4" />
      <circle cx="210" cy="520" r="2.5" fill="#F8F6F0" opacity="0.45" />
      <circle cx="460" cy="470" r="2" fill="#C5A059" opacity="0.4" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat block (shared between desktop brand panel & mobile footer)    */
/* ------------------------------------------------------------------ */
const STATS: [string, string][] = [
  ["12.4k", "Papers indexed"],
  ["860", "Active scholars"],
  ["99.9%", "Source fidelity"],
]

function StatCards({ loraClass }: { loraClass: string }) {
  return (
    <>
      {STATS.map(([value, label]) => (
        <div
          key={label}
          className="border-l-3 border-[#C5A059] pl-3"
        >
          <p className={`${loraClass} text-2xl font-semibold text-[#C5A059] leading-none`}>{value}</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-primary-foreground/60">
            {label}
          </p>
        </div>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */
export function AccessGate({ onAuthed }: { onAuthed: (role: AuthRole) => void }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<(typeof ROLES)[number]>("Student")
  const [domain, setDomain] = useState(DOMAINS[0])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage("")

    const lowerEmail = email.trim().toLowerCase()
    if (!lowerEmail.endsWith("@qu.edu.qa") && !lowerEmail.endsWith("@student.qu.edu.qa")) {
      setErrorMessage("Access Denied: You must use a valid Qatar University email address.")
      setLoading(false)
      return
    }

    let dbRole: AuthRole = "student"
    if (role === "Faculty") dbRole = "faculty"
    if (role === "Researcher") dbRole = "researcher"

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: lowerEmail,
          password,
          options: {
            data: {
              full_name: fullName || "New Academic User",
              role: dbRole,
              academic_domain: domain,
            },
          },
        })

        if (error) throw error
        if (!data?.user) throw new Error("Account creation did not return a valid user.")

        alert("Account created successfully! You can now log in.")
        setIsSignUp(false)
        setErrorMessage("")
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: lowerEmail,
        password,
      })

      if (error) throw error
      if (!data?.user) throw new Error("Authentication failed.")

      onAuthed(dbRole)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during authentication."
      console.error(err)
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 overflow-hidden lg:grid-cols-2">
      {/* -------------------------------------------------------- */}
      {/* MOBILE HEADER — brand identity compressed into slim bar   */}
      {/* -------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-[#C5A059]/30 bg-primary px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <GraduationCap className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-primary-foreground">EduNexus AI</p>
            <p className={`${loraDisplay.className} text-[11px] text-[#C5A059]/80 leading-tight`}>
              QA 76.9 .E34 2026
            </p>
          </div>
        </div>
        <p className="text-[11px] text-primary-foreground/60">Qatar University</p>
      </div>

      {/* -------------------------------------------------------- */}
      {/* DESKTOP BRAND PANEL — bound journal / thesis cover        */}
      {/* -------------------------------------------------------- */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        {/* Lattice + graph background */}
        <BrandGraphic />

        {/* Subtle gradient veil to keep text readable over the SVG */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-primary/40" />

        {/* Gold spine rule (right edge) */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-[#C5A059]/30" />

        {/* ---- Content stack ---- */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <GraduationCap className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">EduNexus AI</p>
            <p className={`${loraDisplay.className} text-xs text-[#C5A059]/70 leading-tight`}>
              QA 76.9 .E34 2026
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <ShieldCheck className="size-3.5" />
            Secure Academic Access
          </div>
          <h2 className={`${loraDisplay.className} text-pretty text-3xl font-semibold leading-tight`}>
            Collaborative Academic Knowledge Workspace & Research Sandbox
          </h2>
          <p className="text-pretty leading-relaxed text-primary-foreground/75">
            Ground every research conversation in verifiable sources. Map methodologies, defend your findings, and
            surface the gaps worth pursuing.
          </p>

          {/* Index-card style stats — VISUAL ANCHOR */}
          <div className="grid grid-cols-3 gap-4 pt-1">
            <StatCards loraClass={loraDisplay.className} />
          </div>
        </div>

        <p className="relative z-10 text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} Qatar University · College of Engineering
        </p>
      </div>

      {/* -------------------------------------------------------- */}
      {/* FORM PANEL — warm paper / reference-card feel             */}
      {/* -------------------------------------------------------- */}
      <div className="flex flex-col items-center justify-center overflow-y-auto bg-[#F8F6F0] px-6 py-4 sm:px-10 sm:py-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-5 rounded-md border border-[#E2DCD1] bg-white p-7"
        >
          <div className="space-y-1">
            <h3 className="text-xl font-semibold tracking-tight text-[#2C2416]">
              {isSignUp ? "Create your workspace account" : "Sign in to your workspace"}
            </h3>
            <p className="text-sm text-muted-foreground">Use your Qatar University academic credentials.</p>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {errorMessage}
            </div>
          )}

          {isSignUp && (
            <Field label="Full Name">
              <div className="flex items-center gap-2 rounded-sm border border-[#E2DCD1] bg-white px-3 focus-within:ring-2 focus-within:ring-[#C5A059]">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="name"
                  className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </Field>
          )}

          <Field label="QU Academic Email">
            <div className="flex items-center gap-2 rounded-sm border border-[#E2DCD1] bg-white px-3 focus-within:ring-2 focus-within:ring-[#C5A059]">
              <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@qu.edu.qa"
                className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </Field>

          <Field label="Password">
            <div className="flex items-center gap-2 rounded-sm border border-[#E2DCD1] bg-white px-3 focus-within:ring-2 focus-within:ring-[#C5A059]">
              <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </Field>

          {isSignUp && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Role">
                <SelectBox
                  value={role}
                  onChange={(value) => setRole(value as (typeof ROLES)[number])}
                  options={[...ROLES]}
                />
              </Field>
              <Field label="Domain">
                <SelectBox value={domain} onChange={setDomain} options={DOMAINS} />
              </Field>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Verifying Credentials..." : isSignUp ? "Create Academic Account" : "Enter Workspace"}
          </Button>

          <div className="text-center text-sm">
            {isSignUp ? "Already have an account? " : "New to EduNexus? "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp((current) => !current)
                setErrorMessage("")
              }}
              className="cursor-pointer border-none bg-transparent font-medium text-primary hover:underline"
            >
              {isSignUp ? "Sign in instead" : "Create an account"}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Protected by QU single sign-on · Need help?{" "}
            <span className="cursor-pointer font-medium text-primary">Contact IT Services</span>
          </p>
        </form>

        {/* -------------------------------------------------------- */}
        {/* MOBILE STATS FOOTER — appears only below lg breakpoint   */}
        {/* -------------------------------------------------------- */}
        <div className="mt-6 flex items-center justify-center gap-8 border-t border-[#E2DCD1] pt-5 text-center lg:hidden">
          <StatCards loraClass={loraDisplay.className} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Field label component                                             */
/* ------------------------------------------------------------------ */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-[#2C2416]">{label}</span>
      {children}
    </label>
  )
}

/* ------------------------------------------------------------------ */
/*  Select / dropdown component                                       */
/* ------------------------------------------------------------------ */
function SelectBox({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-sm border border-[#E2DCD1] bg-white py-2.5 pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-[#C5A059]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
}