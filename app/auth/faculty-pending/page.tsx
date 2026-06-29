"use client"

import { GraduationCap, ShieldCheck, Clock, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function FacultyPendingPage() {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left panel — QU Maroon branding */}
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
            Faculty Access Pending
          </div>
          <h2 className="text-pretty text-3xl font-semibold leading-tight">
            Your Faculty Workspace Access Request Is Under Review
          </h2>
          <p className="text-pretty leading-relaxed text-primary-foreground/75">
            An administrator is reviewing your Qatar University faculty credentials. You will be notified once your
            access to the Teacher Evaluation Portal has been granted.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-2">
            {[
              ["12.4k", "Papers indexed"],
              ["860", "Active scholars"],
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

      {/* Right panel — Pending approval card */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent/20">
            <Clock className="size-8 text-accent-foreground" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-card-foreground">
              Faculty Access Pending Approval
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Thank you for registering as a faculty member. An administrator is reviewing your request to access the
              Teacher Evaluation Portal. You will be granted workspace access shortly.
            </p>
          </div>

          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-left text-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="size-5 shrink-0 text-accent-foreground mt-0.5" />
              <div>
                <p className="font-medium text-card-foreground">In the meantime, you can:</p>
                <ul className="mt-1.5 list-disc pl-4 text-xs text-muted-foreground space-y-1">
                  <li>Upload and analyze research documents in the Document Studio</li>
                  <li>Explore the Methodology Graph Workspace</li>
                  <li>Map knowledge dependencies between academic papers</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>

          <p className="text-xs text-muted-foreground">
            Need help?{" "}
            <span className="cursor-pointer font-medium text-primary">Contact IT Services</span>
          </p>
        </div>
      </div>
    </div>
  )
}