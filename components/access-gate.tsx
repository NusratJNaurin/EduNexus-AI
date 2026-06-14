"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { GraduationCap, Mail, Lock, ChevronDown, ShieldCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"

const ROLES = ["Student", "Faculty", "Researcher"] as const
const DOMAINS = [
  "Computer Engineering",
  "Electrical Engineering",
  "Medicine",
  "Pharmacy",
  "Civil & Architectural Eng.",
  "Data Science",
]

export function AccessGate({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<typeof ROLES[number]>("Student")
  const [domain, setDomain] = useState(DOMAINS[0])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage("")

    // 1. Enforce QU Email Domain Checks
    const lowerEmail = email.trim().toLowerCase()
    if (!lowerEmail.endsWith("@qu.edu.qa") && !lowerEmail.endsWith("@student.qu.edu.qa")) {
      setErrorMessage("Access Denied: You must use a valid Qatar University email address.")
      setLoading(false)
      return
    }

    try {
      // 2. Map frontend visual roles to the exact Postgres Enum lowercases
      let dbRole: "student" | "faculty" | "researcher" = "student"
      if (role === "Faculty") dbRole = "faculty"
      if (role === "Researcher") dbRole = "researcher"

      // 3. Attempt to sign in via Supabase Auth
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: lowerEmail,
        password: password,
      })

      let activeUser = signInData?.user

      // 4. Sign-up Flow: If the user doesn't exist, register them automatically
      if (signInError && signInError.message.includes("Invalid login credentials")) {
        const generatedName = lowerEmail.split("@")[0].replace(".", " ").replace(/\b\w/g, (c) => c.toUpperCase())

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: lowerEmail,
          password: password,
          options: {
            data: {
              full_name: generatedName,
              role: dbRole,
              academic_domain: domain, // This fixes your "defaulting to general" issue instantly
            },
          },
        })

        if (signUpError) throw signUpError
        activeUser = signUpData?.user
      } else if (signInError) {
        throw signInError
      }

      if (activeUser) {
        onAuthed()
      }
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message || "An error occurred during authentication.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-2">
      {/* Brand panel */}
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
            Ground every research conversation in verifiable sources. Map methodologies, defend your
            findings, and surface the gaps worth pursuing.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2">
            {[
              ["12.4k", "Papers indexed"],
              ["860", "Active scholars"],
              ["99.9%", "Source fidelity"],
            ].map(([v, l]) => (
              <div key={l}>
                <p className="text-2xl font-semibold text-accent">{v}</p>
                <p className="text-xs text-primary-foreground/60">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} Qatar University · College of Engineering
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-7 shadow-sm"
        >
          <div className="space-y-1">
            <h3 className="text-xl font-semibold tracking-tight text-card-foreground">Sign in to your workspace</h3>
            <p className="text-sm text-muted-foreground">Use your Qatar University academic credentials.</p>
          </div>

          {errorMessage && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive font-medium rounded-lg border border-destructive/20">
              {errorMessage}
            </div>
          )}

          <Field label="QU Academic Email">
            <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
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
            <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Role">
              <SelectBox value={role} onChange={(v) => setRole(v as any)} options={[...ROLES]} />
            </Field>
            <Field label="Domain">
              <SelectBox value={domain} onChange={setDomain} options={DOMAINS} />
            </Field>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {loading ? "Verifying Credentials..." : "Enter Workspace"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Protected by QU single sign-on · Need help?{" "}
            <span className="font-medium text-primary cursor-pointer">Contact IT Services</span>
          </p>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      {children}
    </label>
  )
}

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
        className="w-full appearance-none rounded-lg border border-input bg-background py-2.5 pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
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