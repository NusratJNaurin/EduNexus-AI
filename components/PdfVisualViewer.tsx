"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface PdfVisualViewerProps {
  fileUrl: string | null
}

export function PdfVisualViewer({ fileUrl }: PdfVisualViewerProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isRemoteUrl = !!fileUrl && /^https?:\/\//i.test(fileUrl)

  useEffect(() => {
    let isMounted = true

    const resolveUrl = async () => {
      if (!fileUrl) {
        console.log("[PdfVisualViewer] No fileUrl provided, showing empty state.")
        setResolvedUrl(null)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      if (isRemoteUrl) {
        console.log("[PdfVisualViewer] Using direct remote URL:", fileUrl.slice(0, 80))
        setResolvedUrl(fileUrl)
        setLoading(false)
        return
      }

      console.log("[PdfVisualViewer] Resolving storage path to signed URL:", fileUrl)

      const { data, error: signError } = await supabase.storage
        .from("documents")
        .createSignedUrl(fileUrl, 60 * 10)

      if (!isMounted) return

      if (signError) {
        console.error("[PdfVisualViewer] Signed URL creation failed:", signError.message)
        setError(signError.message)
        setResolvedUrl(null)
        setLoading(false)
        return
      }

      if (!data?.signedUrl) {
        console.error("[PdfVisualViewer] Signed URL returned empty.")
        setError("Signed URL could not be generated.")
        setResolvedUrl(null)
        setLoading(false)
        return
      }

      console.log("[PdfVisualViewer] Signed URL resolved successfully, length:", data.signedUrl.length)
      setResolvedUrl(data.signedUrl)
      setLoading(false)
    }

    void resolveUrl()

    return () => {
      isMounted = false
    }
  }, [fileUrl, isRemoteUrl])

  if (!fileUrl) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
        No remote file URL associated with this record.
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-destructive/30 bg-destructive/10 text-xs text-destructive px-4 text-center">
        Failed to load PDF: {error}
      </div>
    )
  }

  if (loading || !resolvedUrl) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
        Preparing private file access...
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl border border-border bg-muted/10 p-2">
      {/* Native Browser PDF Core Sandbox */}
      <iframe
        src={`${resolvedUrl}#toolbar=1&navpanes=0`}
        className="h-[600px] w-full rounded-lg bg-background shadow-xs"
        title="PDF Document Viewer"
        onError={() => console.error("[PdfVisualViewer] iframe failed to load PDF at:", resolvedUrl.slice(0, 80))}
      />
    </div>
  )
}