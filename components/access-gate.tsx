"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, ChevronDown, Eye, EyeOff, GraduationCap, Lock, Mail, ShieldCheck } from "lucide-react"
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

type AuthRole = "student" | "faculty" | "researcher"

const MAROON = "#8A1538"
const MAROON_DARK = "#5c0c25"
const MAROON_DEEP = "#2d0612"
const GOLD = "#C5A059"
const PAPER = "#F8F6F0"

/* ------------------------------------------------------------------ */
/*  Network visualization (animated nodes + edges)                     */
/* ------------------------------------------------------------------ */
function LoginNetworkViz() {
  const nodes = [
    { cx: 180, cy: 80, r: 5, delay: 0 },
    { cx: 280, cy: 130, r: 4, delay: 0.4 },
    { cx: 200, cy: 200, r: 6, delay: 0.8 },
    { cx: 100, cy: 160, r: 3.5, delay: 1.2 },
    { cx: 320, cy: 240, r: 4, delay: 0.2 },
    { cx: 140, cy: 280, r: 3, delay: 0.6 },
    { cx: 250, cy: 310, r: 5, delay: 1 },
    { cx: 80, cy: 320, r: 3, delay: 1.4 },
    { cx: 350, cy: 160, r: 3, delay: 0.7 },
    { cx: 310, cy: 340, r: 4, delay: 1.1 },
  ]
  const edges: [number, number][] = [
    [0, 1], [0, 3], [1, 2], [1, 4], [2, 3], [2, 5], [3, 5], [4, 6], [5, 6], [5, 7], [6, 9], [8, 1], [8, 4],
  ]
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].cx}
          y1={nodes[a].cy}
          x2={nodes[b].cx}
          y2={nodes[b].cy}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
          strokeDasharray="4 3"
          style={{ animation: `lineDash ${2 + i * 0.15}s linear infinite`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle
            cx={n.cx}
            cy={n.cy}
            r={n.r * 2.5}
            fill="rgba(255,255,255,0.06)"
            style={{ animation: `nodePulse ${2.5 + i * 0.2}s ease-in-out infinite`, animationDelay: `${n.delay}s` }}
          />
          <circle
            cx={n.cx}
            cy={n.cy}
            r={n.r}
            fill="rgba(255,255,255,0.55)"
            style={{ animation: `nodePulse ${2 + i * 0.15}s ease-in-out infinite`, animationDelay: `${n.delay + 0.2}s` }}
          />
        </g>
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Mashrabiya lattice overlay (gold on maroon)                        */
/* ------------------------------------------------------------------ */
function MashrabiyaOverlay({ patternId, color }: { patternId: string; color: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.07 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={patternId} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="8" fill="none" stroke={color} strokeWidth="0.8" />
          <circle cx="20" cy="20" r="4" fill="none" stroke={color} strokeWidth="0.5" />
          <line x1="20" y1="4" x2="20" y2="36" stroke={color} strokeWidth="0.4" />
          <line x1="4" y1="20" x2="36" y2="20" stroke={color} strokeWidth="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Field state helper                                                 */
/* ------------------------------------------------------------------ */
type FieldState = "idle" | "focused" | "error" | "success"

function LoginField({
  label,
  type,
  placeholder,
  icon: Icon,
  value,
  onChange,
  state,
  helperText,
}: {
  label: string
  type: string
  placeholder: string
  icon: React.ElementType
  value: string
  onChange: (v: string) => void
  state: FieldState
  helperText?: string
}) {
  const [focused, setFocused] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const isPw = type === "password"
  const wrapClass = `login-input-wrap${focused || state === "error" || state === "success" ? " " + state : ""}${focused ? " focused" : ""}`
  const borderColor = state === "error" ? "#ef4444" : state === "success" ? "#22c55e" : focused ? MAROON : "rgba(0,0,0,0.12)"
  const iconColor = state === "error" ? "#ef4444" : state === "success" ? "#22c55e" : focused ? MAROON : "#a0a0b0"
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold tracking-wider" style={{ color: "#717182", letterSpacing: ".08em" }}>
        {label}
      </label>
      <div
        className={`${wrapClass} relative flex items-center rounded-lg border px-3 py-2.5 gap-2.5`}
        style={{ borderColor, background: "white", transition: "border-color .2s", boxShadow: focused ? `0 0 0 3px rgba(138,21,56,0.1)` : "none" }}
      >
        <Icon size={14} style={{ color: iconColor, flexShrink: 0, transition: "color .2s" }} />
        <input
          type={isPw && !showPw ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 text-xs bg-transparent border-none outline-none"
          style={{ color: "#030213" }}
        />
        {isPw && (
          <button
            onClick={() => setShowPw((s) => !s)}
            className="flex-shrink-0 cursor-pointer"
            style={{ color: "#a0a0b0", transition: "color .15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = MAROON)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#a0a0b0")}
          >
            {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
        {state === "success" && <CheckCircle2 size={13} style={{ color: "#22c55e", flexShrink: 0 }} />}
        {state === "error" && <AlertCircle size={13} style={{ color: "#ef4444", flexShrink: 0 }} />}
        {/* Animated underline */}
        <span
          className="absolute bottom-0 left-0 h-0.5 rounded-b-lg"
          style={{
            right: 0,
            background: state === "error" ? "#ef4444" : state === "success" ? "#22c55e" : MAROON,
            transform: focused || state === "error" || state === "success" ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left",
            transition: "transform .25s ease",
          }}
        />
      </div>
      {helperText && <p className="text-xs" style={{ color: state === "error" ? "#ef4444" : "#717182" }}>{helperText}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Field label component                                             */
/* ------------------------------------------------------------------ */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "#717182" }}>
        {label}
      </span>
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
        className="w-full appearance-none rounded-lg border bg-white px-3 py-2.5 pr-9 text-xs outline-none transition-shadow"
        style={{ borderColor: "rgba(0,0,0,0.12)", color: "#030213" }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#a0a0b0]"
        aria-hidden="true"
      />
    </div>
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

  const [emailState, setEmailState] = useState<FieldState>("idle")
  const [pwState, setPwState] = useState<FieldState>("idle")
  const [ripple, setRipple] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setRipple(true)
    setTimeout(() => setRipple(false), 600)
    setLoading(true)
    setErrorMessage("")
    setEmailState("idle")
    setPwState("idle")

    const lowerEmail = email.trim().toLowerCase()
    if (!lowerEmail.endsWith("@qu.edu.qa") && !lowerEmail.endsWith("@student.qu.edu.qa")) {
      setErrorMessage("Access Denied: You must use a valid Qatar University email address.")
      setEmailState("error")
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

      setPassword("")
      onAuthed(dbRole)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during authentication."
      console.error(err)
      setErrorMessage(message)
      setPwState("error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full h-screen overflow-hidden" style={{ animation: "fadeIn .5s ease" }}>
      {/* Left — brand / network viz panel */}
      <div
        className="relative hidden flex-col justify-between p-10 flex-shrink-0 overflow-hidden lg:flex"
        style={{ width: "44%", background: `linear-gradient(160deg,${MAROON} 0%,${MAROON_DARK} 55%,${MAROON_DEEP} 100%)` }}
      >
        <LoginNetworkViz />
        <MashrabiyaOverlay patternId="loginMash" color="white" />

        {/* Secure badge */}
        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs mb-6"
            style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.18)" }}
          >
            <ShieldCheck size={12} /> Secure Academic Access
          </div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <GraduationCap size={20} color={GOLD} />
            </div>
            <div>
              <p className="font-bold text-white" style={{ fontSize: 14 }}>EduNexus AI</p>
              <p className="text-[#C5A059]/80" style={{ fontSize: 10 }}>Qatar University</p>
            </div>
          </div>

          <h1 className="font-bold text-white leading-tight mb-4" style={{ fontSize: 26, lineHeight: 1.25 }}>
            Collaborative Academic<br />Knowledge Workspace &<br />Research Sandbox
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.6)", maxWidth: 300 }}>
            Ground every research conversation in verifiable sources. Map methodologies, defend your findings, and surface the gaps worth pursuing.
          </p>

          {/* Stats */}
          <div className="flex gap-6">
            {[["12.4k", "Papers Indexed"], ["860", "Active Scholars"], ["99.9%", "Source Fidelity"]].map(([n, l]) => (
              <div key={l}>
                <p className="font-bold text-[#C5A059]" style={{ fontSize: 17 }}>{n}</p>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 9, letterSpacing: ".06em", textTransform: "uppercase" }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 10 }}>
            © {new Date().getFullYear()} Qatar University · College of Engineering
          </p>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex items-center justify-center px-10 overflow-y-auto" style={{ background: PAPER }}>
        {/* Subtle background texture */}
        <MashrabiyaOverlay patternId="formMash" color={MAROON} />

        <div className="relative z-10 w-full max-w-sm py-8" style={{ animation: "fadeInUp .6s ease .15s both" }}>
          {/* Form card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: "white",
              boxShadow: "0 4px 32px rgba(138,21,56,0.1), 0 1px 4px rgba(0,0,0,0.06)",
              border: "1px solid rgba(197,160,89,0.25)",
            }}
          >
            <div className="mb-7">
              <h2 className="font-bold mb-1.5" style={{ color: "#030213", fontSize: 20 }}>
                {isSignUp ? "Create your workspace account" : "Sign in to your workspace"}
              </h2>
              <p className="text-xs" style={{ color: "#717182" }}>Use your Qatar University academic credentials.</p>
            </div>

            {errorMessage && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600" style={{ color: "#dc2626" }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {isSignUp && (
                <Field label="Full Name">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="name"
                    className="w-full rounded-lg border bg-white px-3 py-2.5 text-xs outline-none transition-shadow"
                    style={{ borderColor: "rgba(0,0,0,0.12)", color: "#030213" }}
                  />
                </Field>
              )}

              <LoginField
                label="Qu Academic Email"
                type="email"
                placeholder="name@qu.edu.qa"
                icon={Mail}
                value={email}
                onChange={(v) => { setEmail(v); setEmailState("idle") }}
                state={emailState}
                helperText={emailState === "error" ? "Enter a valid QU email address" : undefined}
              />
              <LoginField
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                value={password}
                onChange={(v) => { setPassword(v); setPwState("idle") }}
                state={pwState}
                helperText={pwState === "error" ? "Please check your credentials" : undefined}
              />

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

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="enter-btn relative w-full rounded-xl py-3 font-semibold text-white text-sm mt-1 cursor-pointer"
                style={{
                  background: `linear-gradient(135deg,${MAROON} 0%,${MAROON_DARK} 100%)`,
                  boxShadow: "0 4px 14px rgba(138,21,56,0.3)",
                  transition: "transform .18s,box-shadow .18s,opacity .18s",
                  opacity: loading ? 0.85 : 1,
                }}
              >
                {/* Ripple */}
                {ripple && (
                  <span className="absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none">
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        background: "rgba(255,255,255,0.3)",
                        borderRadius: "50%",
                        animation: "rippleOut .6s ease forwards",
                      }}
                    />
                  </span>
                )}
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white",
                        borderRadius: "50%",
                        animation: "spin .7s linear infinite",
                        display: "inline-block",
                      }}
                    />
                    Verifying Credentials...
                  </span>
                ) : (
                  isSignUp ? "Create Academic Account" : "Enter Workspace"
                )}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-xs" style={{ color: "#717182" }}>
                {isSignUp ? "Already have an account? " : "New to EduNexus? "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp((current) => !current)
                    setErrorMessage("")
                    setEmailState("idle")
                    setPwState("idle")
                  }}
                  className="signup-link font-semibold"
                  style={{ color: MAROON }}
                >
                  {isSignUp ? "Sign in instead" : "Create an account"}
                </button>
              </p>
              <p className="text-xs" style={{ color: "#a0a0b0" }}>
                Protected by QU single sign-on · Need help?{" "}
                <button className="signup-link cursor-pointer" style={{ color: MAROON }}>Contact IT Services</button>
              </p>
            </div>
          </div>

          {/* Auth badge */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
            </div>
            <p style={{ color: "#a0a0b0", fontSize: 10 }}>Authentication / Universal Access Gate</p>
          </div>
        </div>
      </div>
    </div>
  )
}