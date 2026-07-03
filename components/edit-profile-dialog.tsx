"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Loader2, User, BookOpen, ShieldCheck, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { profilesCrud } from "@/lib/crud"

interface EditProfileDialogProps {
  open: boolean
  onClose: () => void
  userId: string | null
  initialName: string | null
  initialRole: string | null
  initialDomain: string | null
  onProfileUpdated: () => void
}

export function EditProfileDialog({
  open,
  onClose,
  userId,
  initialName,
  initialRole,
  initialDomain,
  onProfileUpdated,
}: EditProfileDialogProps) {
  const [name, setName] = useState(initialName ?? "")
  const [domain, setDomain] = useState(initialDomain ?? "")
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setName(initialName ?? "")
      setDomain(initialDomain ?? "")
      setNewPassword("")
      setError("")
    }
  }, [open, initialName, initialDomain])

  const handleSave = useCallback(async () => {
    if (!userId) return
    setSaving(true)
    setError("")

    try {
      // Update profile fields (name + domain)
      await profilesCrud.updateById(userId, {
        full_name: name.trim(),
        academic_domain: domain.trim(),
      })

      // Update password if provided
      if (newPassword.trim()) {
        const { error: authError } = await supabase.auth.updateUser({
          password: newPassword.trim(),
        })
        if (authError) throw authError
      }

      onProfileUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.")
    } finally {
      setSaving(false)
    }
  }, [userId, name, domain, newPassword, onProfileUpdated, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h4 className="text-sm font-semibold text-foreground">Edit Profile</h4>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Full Name */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
              <User className="size-3" /> Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary text-foreground"
            />
          </div>

          {/* Major / Academic Domain */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
              <BookOpen className="size-3" /> Major / Academic Domain
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. Computer Science, Engineering, etc."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary text-foreground"
            />
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
              <ShieldCheck className="size-3" /> Role
            </label>
            <div className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-xs text-muted-foreground capitalize">
              {initialRole || "Not set"}
            </div>
          </div>

          {/* New Password (optional) */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
              <KeyRound className="size-3" /> New Password <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary text-foreground"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive font-medium">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving || !name.trim()}
            onClick={handleSave}
            className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
          >
            {saving && <Loader2 className="size-3 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}