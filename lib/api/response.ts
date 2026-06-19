import { NextResponse } from "next/server"

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "An unexpected server error occurred."
}
