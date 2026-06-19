import type {
  AnalyzeDependenciesRequest,
  AnalyzeDependenciesResponse,
  ApiErrorResponse,
  ChatRequest,
  ChatResponse,
  SummarizeRequest,
  SummarizeResponse,
  VivaResponse,
} from "@/lib/types"

async function parseResponse<T>(response: Response): Promise<T> {
  const data: T | ApiErrorResponse = await response.json()
  if (!response.ok) {
    const errorPayload = data as ApiErrorResponse
    throw new Error(errorPayload.error ?? `Request failed with status ${response.status}`)
  }
  return data as T
}

export async function postChat(body: ChatRequest): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<ChatResponse>(response)
}

export async function postSummarize(body: SummarizeRequest): Promise<SummarizeResponse> {
  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<SummarizeResponse>(response)
}

export async function postAnalyzeDependencies(
  body: AnalyzeDependenciesRequest,
): Promise<AnalyzeDependenciesResponse> {
  const response = await fetch("/api/analyze-dependencies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<AnalyzeDependenciesResponse>(response)
}

export async function postViva(formData: FormData): Promise<VivaResponse> {
  const response = await fetch("/api/viva", {
    method: "POST",
    body: formData,
  })
  return parseResponse<VivaResponse>(response)
}
