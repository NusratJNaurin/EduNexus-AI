"use client"

import { createContext, useContext } from "react"
import type { UserRole } from "@/lib/types"

export interface UserSessionValue {
  authed: boolean
  profileId: string | null
  profileName: string | null
  profileMajor: string | null
  profileRole: UserRole | null
  setAuthed: (value: boolean) => void
  setProfileId: (value: string | null) => void
  setProfileName: (value: string | null) => void
  setProfileMajor: (value: string | null) => void
  setProfileRole: (value: UserRole | null) => void
}

const UserSessionContext = createContext<UserSessionValue | null>(null)

export function UserSessionProvider({
  value,
  children,
}: {
  value: UserSessionValue
  children: React.ReactNode
}) {
  return <UserSessionContext.Provider value={value}>{children}</UserSessionContext.Provider>
}

export function useUserSession() {
  const context = useContext(UserSessionContext)

  if (!context) {
    throw new Error("useUserSession must be used within a UserSessionProvider")
  }

  return context
}