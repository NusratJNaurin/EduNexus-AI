"use client"

import { useCallback, useState } from "react"

interface UseApiState {
  loading: boolean
  error: string | null
}

export function useApiMutation<TArgs extends unknown[], TResult>(
  mutationFn: (...args: TArgs) => Promise<TResult>,
) {
  const [state, setState] = useState<UseApiState>({ loading: false, error: null })

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setState({ loading: true, error: null })
      try {
        const result = await mutationFn(...args)
        setState({ loading: false, error: null })
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : "Request failed."
        setState({ loading: false, error: message })
        return null
      }
    },
    [mutationFn],
  )

  const clearError = useCallback(() => {
    setState((current) => ({ ...current, error: null }))
  }, [])

  return { execute, loading: state.loading, error: state.error, clearError }
}

export function usePersistedMessages(storageKey: string | null) {
  const loadMessages = useCallback((): Array<{ id: string; text: string; isUser: boolean }> => {
    if (!storageKey || typeof window === "undefined") return []
    const saved = localStorage.getItem(storageKey)
    if (!saved) return []
    try {
      const parsed: unknown = JSON.parse(saved)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(
        (item): item is { id: string; text: string; isUser: boolean } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { id: string }).id === "string" &&
          typeof (item as { text: string }).text === "string" &&
          typeof (item as { isUser: boolean }).isUser === "boolean",
      )
    } catch {
      return []
    }
  }, [storageKey])

  const saveMessages = useCallback(
    (messages: Array<{ id: string; text: string; isUser: boolean }>) => {
      if (!storageKey || typeof window === "undefined") return
      localStorage.setItem(storageKey, JSON.stringify(messages))
    },
    [storageKey],
  )

  const clearMessages = useCallback(() => {
    if (!storageKey || typeof window === "undefined") return
    localStorage.removeItem(storageKey)
  }, [storageKey])

  return { loadMessages, saveMessages, clearMessages }
}
