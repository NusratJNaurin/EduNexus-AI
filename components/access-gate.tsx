"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, GraduationCap, ShieldCheck, Loader2, User, Building, Briefcase } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

const MEMBER_TYPES = ["Student", "Researcher", "Faculty Member"] as const
const DEPARTMENTS = [
  "Computer Engineering",
  "Electrical Engineering",
  "Medicine",
  "Pharmacy",
  "Civil & Architectural Eng.",
  "Data Science",
]

type AuthRole = "student" | "faculty" | "researcher"

// ─── Step identifiers ───────────────────────────────────────────────────────
type AuthStep = "signin" | "onboarding"

export function AccessGate({
  onAuthed,
  onShowOnboarding,
  defaultStep,
}: {
  onAuthed: (role: AuthRole) => void
  onShowOnboarding: () => void
  defaultStep?: AuthStep
}) {
  const [step, setStep] = useState<AuthStep>(defaultStep ?? "signin")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  // Onboarding form state
  const [fullName, setFullName] = useState("")
  const [department, setDepartment] = useState(DEPARTMENTS[0])
  const [memberType, setMemberType] = useState<(typeof MEMBER_TYPES)[number]>("Student")

  // ─── Step 1: Microsoft OAuth sign-in ──────────────────────────────────────

  const handleMicrosoftSignIn = async () => {
    setLoading(true)
    setErrorMessage("")
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          scopes: "email openid profile",
          redirectTo: `${window.location.origin}`,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Microsoft sign-in failed."
      console.error(err)
      setErrorMessage(message)
      setLoading(false)
    }
  }

  // ─── Step 2: Onboarding form submission ───────────────────────────────────

  const handleCompleteSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage("")

    const name = fullName.trim()
    if (!name) {
      setErrorMessage("Please enter your full name.")
      setLoading(false)
      return
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Authentication session not found. Please sign in again.")

      // Map member type to the internal role
      let dbRole: AuthRole = "student"
      if (memberType === "Faculty Member") dbRole = "faculty"
      if (memberType === "Researcher") dbRole = "researcher"

      // Update the user's profile with the onboarding data
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: name,
          academic_domain: department,
          role: dbRole,
        })
        .eq("id", user.id)

      if (updateError) throw updateError

      // If faculty member, create a pending role request
      if (dbRole === "faculty") {
        const { error: requestError } = await supabase.from("role_requests").insert({
          user_id: user.id,
          requested_role: "faculty",
          status: "pending",
        })
        if (requestError) {
          // If the row already exists (unique constraint), that's fine
          if (!requestError.message?.includes("duplicate") && !requestError.message?.includes("unique")) {
            console.error("Role request insert warning:", requestError)
          }
        }
      }

      onAuthed(dbRole)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to complete workspace setup."
      console.error(err)
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-2">
      {/* ── Left panel — QU Maroon branding ────────────────────────────── */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <GraduationCap className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">EduNexus AI</p>
            <p className="text-xs text-primary-foreground/70">Qatar University</p>
          </div>
        </div>

        <div className="max-w-md space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <ShieldCheck className="size-3.5" />
            Secure Academic Access
          </div>
          <h2 className="text-pretty text-3xl font-semibold leading-tight">
            Collaborative Academic Knowledge Workspace & Research Sandbox
          </h2>
          <p className="text-pretty leading-relaxed text-primary-foreground/75">
            Ground every research conversation in verifiable sources. Map methodologies, defend your findings, and
            surface the gaps worth pursuing.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2">
            {[
              ["12.4k", "Papers indexed"],
              ["860", "Active scholars"],
              ["99.9%", "Source fidelity"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-2xl font-semibold text-accent">{value}</p>
                <p className="text-xs text-primary-foreground/60">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} Qatar University · College of Engineering
        </p>
      </div>

      {/* ── Right panel — Auth card ───────────────────────────────────── */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        {step === "signin" ? (
          /* ════ Step 1: Sign In ════════════════════════════════════════ */
          <form
            onSubmit={(e) => { e.preventDefault(); handleMicrosoftSignIn() }}
            className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm text-center"
          >
            <div className="space-y-1">
              <h3 className="text-xl font-semibold tracking-tight text-card-foreground">
                Sign in to your workspace
              </h3>
              <p className="text-sm text-muted-foreground">Use your Qatar University academic credentials.</p>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive text-left">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <svg viewBox="0 0 23 23" className="size-5 shrink-0" aria-hidden="true">
                  <rect width="23" height="23" rx="2" fill="#f25022" />
                  <rect x="1" y="1" width="10.5" height="10.5" fill="#f25022" />
                  <rect x="11.5" y="1" width="10.5" height="10.5" fill="#7fba00" />
                  <rect x="1" y="11.5" width="10.5" height="10.5" fill="#00a4ef" />
                  <rect x="11.5" y="11.5" width="10.5" height="10.5" fill="#ffb900" />
                </svg>
              )}
              Sign in with Microsoft
            </button>

            <p className="text-xs text-muted-foreground">
              Protected by QU single sign-on · Need help?{" "}
              <span className="cursor-pointer font-medium text-primary">Contact IT Services</span>
            </p>
          </form>
        ) : (
          /* ════ Step 2: Onboarding Setup ═══════════════════════════════ */
          <form
            onSubmit={handleCompleteSetup}
            className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-7 shadow-sm"
          >
            <div className="space-y-1">
              <h3 className="text-xl font-semibold tracking-tight text-card-foreground">
                Complete Workspace Setup
              </h3>
              <p className="text-sm text-muted-foreground">Tell us a bit about yourself to get started.</p>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {errorMessage}
              </div>
            )}

            <Field label="Full Name">
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <User className="size-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Hazim Ahmed"
                  className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </Field>

            <Field label="Department">
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <Building className="size-4 text-muted-foreground" aria-hidden="true" />
                <SelectBox value={department} onChange={setDepartment} options={DEPARTMENTS} />
              </div>
            </Field>

            <Field label="Member Type">
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <Briefcase className="size-4 text-muted-foreground" aria-hidden="true" />
                <SelectBox
                  value={memberType}
                  onChange={(value) => setMemberType(value as (typeof MEMBER_TYPES)[number])}
                  options={[...MEMBER_TYPES]}
                />
              </div>
            </Field>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Setting up workspace...
                </span>
              ) : (
                "Complete Workspace Setup"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Already set up?{" "}
              <button
                type="button"
                onClick={() => {
                  setStep("signin")
                  setErrorMessage("")
                }}
                className="cursor-pointer border-none bg-transparent font-medium text-primary hover:underline"
              >
                Sign in again
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Reusable field label ────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      {children}
    </label>
  )
}

// ─── Reusable select dropdown ────────────────────────────────────────────────
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
    <div className="relative flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-transparent py-2.5 pr-6 text-sm outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
}