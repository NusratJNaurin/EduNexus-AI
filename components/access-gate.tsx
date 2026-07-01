"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, GraduationCap, Lock, Mail, ShieldCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"

type AuthRole = "student" | "faculty" | "researcher"

const ROLE_OPTIONS = ["Student", "Faculty", "Researcher"] as const
const MAJOR_OPTIONS = [
  "Computer Engineering",
  "Electrical Engineering",
  "Medicine",
  "Pharmacy",
  "Civil & Architectural Eng.",
  "Data Science",
]

export function AccessGate({ onAuthed }: { onAuthed: (role: AuthRole) => void }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("Student")
  const [major, setMajor] = useState(MAJOR_OPTIONS[0])
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
              academic_domain: major,
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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle()

      if (profileError) throw profileError

      const nextRole = profile?.role === "faculty" || profile?.role === "researcher" ? profile.role : "student"
      onAuthed(nextRole)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during authentication."
      console.error(err)
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-2">
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

      <div className="flex items-center justify-center p-6 sm:p-10">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-7 shadow-sm"
        >
          <div className="space-y-1">
            <h3 className="text-xl font-semibold tracking-tight text-card-foreground">
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
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
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
          )}

          {isSignUp && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Role">
                <SelectBox
                  value={role}
                  onChange={(value) => setRole(value as (typeof ROLE_OPTIONS)[number])}
                  options={[...ROLE_OPTIONS]}
                />
              </Field>
              <Field label="Major">
                <SelectBox value={major} onChange={setMajor} options={MAJOR_OPTIONS} />
              </Field>
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

          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
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
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-lg border border-input bg-background py-2.5 pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
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

