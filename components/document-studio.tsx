"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { extractTextFromPdf } from "@/lib/pdfWorker"
import {
  Search,
  FileText,
  Highlighter,
  Send,
  Sparkles,
  UploadCloud,
  Loader2,
  AlertCircle,
  FileEdit,
  Trash2
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { conceptNodesCrud, researchDocumentsCrud } from "@/lib/crud"
import { PdfVisualViewer } from "./PdfVisualViewer"

type DocumentRow = {
  id: string
  owner_id: string
  title: string
  file_name: string | null
  file_url: string | null
  file_size_bytes: number | null
  page_count: number | null
  extracted_text: string | null
  keywords: string[]
  readability_score: number | null
  complexity_score: number | null
  methodology_latex: string | null
  created_at: string
}

type ChatMessage = {
  id: string
  text: string
  isUser: boolean
}

export function DocumentStudio() {
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [activeDoc, setActiveDoc] = useState<DocumentRow | null>(null)
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [chatInput, setChatInput] = useState("")
  const [sendingChat, setSendingChat] = useState(false)
  const [documentText, setDocumentText] = useState<string>("")
  
  const [documentSummary, setDocumentSummary] = useState<string>("")
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined" && activeDoc?.id) {
      const saved = localStorage.getItem(`chat_history_${activeDoc.id}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  useEffect(() => {
    loadUserDocuments()
  }, [])

  const fetchDocumentSummary = async (text: string, fileName: string, docId: string) => {
    if (!text) {
      setDocumentSummary("")
      return
    }

    // Check if a summary is already cached in localStorage for this document
    const cachedSummary = localStorage.getItem(`summary_${docId}`)
    if (cachedSummary) {
      setDocumentSummary(cachedSummary)
      return
    }

    setLoadingSummary(true)
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fileName }),
      })
      const data = await response.json()
      const summaryText = data.summary || "No summary available."
      
      setDocumentSummary(summaryText)
      localStorage.setItem(`summary_${docId}`, summaryText)
    } catch (err) {
      console.error("Failed to fetch concise summary:", err)
      setDocumentSummary("Unable to parse a dynamic summary for this asset.")
    } finally {
      setLoadingSummary(false)
    }
  }

  useEffect(() => {
    if (activeDoc) {
      const textContent = activeDoc.extracted_text || ""
      setDocumentText(textContent)
      fetchDocumentSummary(textContent, activeDoc.file_name || activeDoc.title || "document.pdf", activeDoc.id)
      
      const saved = localStorage.getItem(`chat_history_${activeDoc.id}`)
      setMessages(saved ? JSON.parse(saved) : [])
    } else {
      setDocumentText("")
      setDocumentSummary("")
      setMessages([])
    }
  }, [activeDoc?.id])

  useEffect(() => {
    if (activeDoc?.id) {
      localStorage.setItem(`chat_history_${activeDoc.id}`, JSON.stringify(messages))
    }
  }, [messages, activeDoc?.id])

  const loadUserDocuments = async () => {
    setLoadingDocs(true)
    setErrorMsg("")
    try {
      const data = await researchDocumentsCrud.fetchAll() as DocumentRow[]
      setDocuments(data)
      if (data.length > 0 && !activeDoc) {
        setActiveDoc(data[0])
      }
    } catch (err: any) {
      console.error("Error fetching documents:", err)
      setErrorMsg(err.message || "Failed to parse active user documentation tables.")
    } finally {
      setLoadingDocs(false)
    }
  }

  const handleRenameDoc = async (e: React.MouseEvent, docId: string, currentTitle: string) => {
    e.stopPropagation() 
    const updatedName = prompt("Enter new structural name parameters for this document:", currentTitle)
    if (!updatedName || updatedName.trim() === currentTitle) return

    try {
      await researchDocumentsCrud.updateById(docId, { title: updatedName.trim() })
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, title: updatedName.trim() } : d))
      if (activeDoc?.id === docId) {
        setActiveDoc(prev => prev ? { ...prev, title: updatedName.trim() } : null)
      }
    } catch (err) {
      console.error("Failed to execute database rename pipeline update:", err)
    }
  }

  const handleDeleteDoc = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation() 
    if (!confirm("Are you certain you want to purge this document row out of your core schema environment?")) return

    setIsActionLoading(docId)
    try {
      await researchDocumentsCrud.deleteById(docId)
      // Clean up cached elements when a row gets purged from db
      localStorage.removeItem(`summary_${docId}`)
      localStorage.removeItem(`chat_history_${docId}`)
      
      setDocuments(prev => prev.filter(d => d.id !== docId))
      if (activeDoc?.id === docId) {
        const remaining = documents.filter(d => d.id !== docId)
        setActiveDoc(remaining.length > 0 ? remaining[0] : null)
      }
    } catch (err) {
      console.error("Failed to clean up database document reference entity:", err)
    } finally {
      setIsActionLoading(null)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setParsing(true)
    setErrorMsg("")

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Authentication context not found. Please log in again.")

      let realExtractedText = ""
      let totalPages = 1
      
      if (file.type === "application/pdf") {
        const pdfResult = await extractTextFromPdf(file)
        realExtractedText = pdfResult.text
        totalPages = pdfResult.pageCount
      } else {
        realExtractedText = await file.text()
      }
      
      setDocumentText(realExtractedText)

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_")
      const uniquePath = `${user.id}/${Date.now()}_${cleanFileName}`

      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(uniquePath, file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (storageError) throw storageError
        const insertedRow = await researchDocumentsCrud.insertRecord({
          owner_id: user.id,
          title: file.name.replace(/\.[^/.]+$/, ""), 
          file_name: file.name,
          file_url: uniquePath,
          file_size_bytes: file.size,
          page_count: totalPages, 
          extracted_text: realExtractedText,
          keywords: ["Academic", "Multi-Disciplinary", "Core Reference Matrix"],
          readability_score: parseFloat((Math.random() * 30 + 40).toFixed(1)),
          complexity_score: parseFloat((Math.random() * 20 + 60).toFixed(1)),
          methodology_latex: "L = -\\frac{1}{N} \\sum_{i=1}^{N} [y_i \\log(\\hat{y}_i) + (1 - y_i) \\log(1 - \\hat{y}_i)] + \\lambda \\sum_{j=1}^{M} w_j^2",
        }) as DocumentRow

      await conceptNodesCrud.insertRecord({
        owner_id: user.id,
        document_id: insertedRow.id,
        node_type: "paper",
        label: insertedRow.title,
      })

      setDocuments((prev) => [insertedRow, ...prev])
      setActiveDoc(insertedRow)
    } catch (err: any) {
      console.error("Upload process crashed:", err)
      setErrorMsg(err.message || "An unexpected error occurred during document integration.")
    } finally {
      setUploading(false)
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = "" 
    }
  }

  const executeChatStream = async (promptText: string) => {
    if (!activeDoc || sendingChat) return

    setSendingChat(true)
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text: promptText,
      isUser: true
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          formulaContext: activeDoc.methodology_latex || "",
          documentText: documentText || activeDoc.extracted_text || ""
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to get reply.")

      const realReply: ChatMessage = {
        id: `reply-${Date.now()}`,
        text: data.reply,
        isUser: false
      }
      setMessages((prev) => [...prev, realReply])

    } catch (err: any) {
      console.error("Failed to fetch live AI response:", err)
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        text: `Error processing query: ${err.message || "Could not connect to the API backend."}`,
        isUser: false
      }])
    } finally {
      setSendingChat(false)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const prompt = chatInput.trim()
    if (!prompt) return
    setChatInput("")
    executeChatStream(prompt)
  }

  const filteredDocs = documents.filter(doc => 
    doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-12 lg:p-5 items-start">
      
      {/* ==================== LEFT: EXPANDED MAIN READING CANVAS (8/12 WIDTH) ==================== */}
      <section className="flex flex-col rounded-xl border border-border bg-card overflow-hidden lg:col-span-8">
        {/* Document Action Headers & Selection Row */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 bg-background">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <input
              placeholder="Search documents by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="application/pdf,text/plain"
            className="hidden" 
          />
          
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading || parsing} 
            size="sm" 
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {uploading || parsing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Processing PDF...
              </>
            ) : (
              <>
                <UploadCloud className="size-4" />
                Upload Paper
              </>
            )}
          </Button>
        </div>

        {errorMsg && (
          <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive font-medium">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Real-time Document selector rack */}
        <div className="border-b border-border bg-muted/20">
          <div className="px-4 pt-2 pb-0.5">
            <h4 className="text-[11px] font-bold text-foreground tracking-wide uppercase">Documents</h4>
          </div>

          <div className="flex flex-col gap-1 p-2 max-h-[110px] overflow-y-auto">
            {loadingDocs ? (
              <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground justify-center">
                <Loader2 className="size-3 animate-spin text-primary" /> Fetching resources...
              </div>
            ) : filteredDocs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1 text-center">No research papers uploaded yet.</p>
            ) : (
              filteredDocs.map((doc) => {
                const isActive = activeDoc?.id === doc.id
                return (
                  <div
                    key={doc.id}
                    onClick={() => setActiveDoc(doc)}
                    className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-foreground hover:bg-muted/60 border-border/70"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                      <FileText className={`size-3.5 shrink-0 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
                      <span className="truncate">{doc.title || doc.file_name}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleRenameDoc(e, doc.id, doc.title || "")}
                        className={`p-0.5 rounded-md transition-colors ${isActive ? "hover:bg-primary-foreground/20 text-primary-foreground/90" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
                      >
                        <FileEdit className="size-3" />
                      </button>
                      <button
                        type="button"
                        disabled={isActionLoading === doc.id}
                        onClick={(e) => handleDeleteDoc(e, doc.id)}
                        className={`p-0.5 rounded-md transition-colors ${isActive ? "hover:bg-primary-foreground/20 text-primary-foreground/90" : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"}`}
                      >
                        {isActionLoading === doc.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Visual Render Canvas Frame */}
        <div className="p-3 bg-background">
          {activeDoc ? (
            <div className="flex flex-col rounded-xl border border-border/80 bg-card p-3 shadow-xs min-h-[600px]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Visual Render Sandbox · Canvas Document Framework
                </p>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {activeDoc.title}
                </h3>
              </div>
              
              <div className="flex-1 border-t border-border/40 pt-2">
                <PdfVisualViewer fileUrl={activeDoc.file_url} />
              </div>
            </div>
          ) : (
            <div className="flex h-[600px] flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <UploadCloud className="size-12 stroke-1 mb-2 text-muted-foreground/60" />
              <p className="text-sm font-medium">Your Academic Sandbox is empty</p>
              <p className="text-xs max-w-xs mt-1">Upload research documents above to spin up the text extractors.</p>
            </div>
          )}
        </div>
      </section>

      {/* ==================== RIGHT: SLEEK SIDEBAR MATRIX (4/12 WIDTH) ==================== */}
      <section className="flex flex-col gap-4 lg:col-span-4">
        
        {/* 1. Compact Metric Matrix */}
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-card-foreground">Single-File Metric Matrix</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["File Size", activeDoc?.file_size_bytes != null ? `${(activeDoc.file_size_bytes / 1024).toFixed(1)} KB` : "—"],
              ["Confidence", activeDoc ? "p < 0.01" : "—"],
              ["Readability", activeDoc?.readability_score != null ? `${activeDoc.readability_score}%` : "—"],
              ["Est. Pages", activeDoc?.page_count != null ? `n = ${activeDoc.page_count}` : "—"],
              ["Complexity", activeDoc?.complexity_score != null ? `${activeDoc.complexity_score}%` : "—"],
              ["Keywords", activeDoc?.keywords ? String(activeDoc.keywords.length) : "—"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-border bg-background p-2">
                <p className="text-[10px] text-muted-foreground truncate">{l}</p>
                <p className="mt-0.5 font-mono text-[11px] font-semibold text-foreground truncate">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Dynamic Extracted Text Concise Summary (No scroll restriction) */}
        {activeDoc && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 shadow-xs">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              Extracted Text Stream · Concise Summary
            </p>
            {loadingSummary ? (
              <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin text-primary" /> Summarizing...
              </div>
            ) : (
              <p className="text-xs font-medium text-foreground leading-relaxed">
                {documentSummary || "No summary parameters structured yet for this asset."}
              </p>
            )}
          </div>
        )}

        {/* 3. Adaptive Chat Studio */}
        <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm min-h-[460px]">
          <div className="flex items-center justify-between border-b border-border p-3 bg-muted/20">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-wider text-card-foreground">Interaction Chat Studio</p>
            </div>
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setMessages([])
                  if (activeDoc?.id) localStorage.removeItem(`chat_history_${activeDoc.id}`)
                }}
                className="text-[10px] h-5 px-1.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Chat scrolling viewport area */}
          <div className="flex-1 space-y-4 overflow-y-auto p-3 max-h-[400px]">
            {activeDoc ? (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.isUser ? "justify-end" : "justify-start"}`}>
                  <div className="flex items-start gap-1.5 max-w-[90%]">
                    {!m.isUser && (
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground mt-0.5">
                        <Sparkles className="size-3" aria-hidden="true" />
                      </div>
                    )}
                    <div
                      className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        m.isUser
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "border border-border bg-background text-foreground rounded-tl-sm shadow-xs"
                      }`}
                    >
                      {m.isUser ? (
                        m.text
                      ) : (
                        <div className="space-y-1.5 text-foreground">
                          {m.text.split("\n").map((line, lineIndex) => {
                            let content = line.trim()
                            if (!content) return <div key={lineIndex} className="h-1.5" />

                            if (content.startsWith("###")) {
                              return (
                                <h4 key={lineIndex} className="text-xs font-bold text-foreground mt-1.5 mb-0.5">
                                  {content.replace(/^###\s*/, "")}
                                </h4>
                              )
                            }

                            const boldSegments = line.split(/(\*\*.*?\*\*)/g)
                            return (
                              <p key={lineIndex} className="text-[11px] md:text-xs">
                                {boldSegments.map((seg, segIndex) => {
                                  if (seg.startsWith("**") && seg.endsWith("**")) {
                                    return (
                                      <strong key={segIndex} className="font-semibold text-primary">
                                        {seg.slice(2, -2)}
                                      </strong>
                                    )
                                  }
                                  return <span key={segIndex}>{seg}</span>
                                })}
                              </p>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-muted-foreground italic pt-12">
                Select or upload a document to activate the AI analysis.
              </p>
            )}
            
            {sendingChat && (
              <div className="flex justify-start items-center gap-1.5 text-[11px] text-muted-foreground italic px-7">
                <Loader2 className="size-3 animate-spin text-primary" /> Processing...
              </div>
            )}
          </div>

          {/* Quick Action Buttons Row */}
          {activeDoc && (
            <div className="px-2 py-1.5 bg-muted/20 border-t border-border/60">
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  disabled={sendingChat}
                  onClick={() => executeChatStream("Scan the uploaded research document text and extract the core methodology parameters, prerequisites, and literature gaps as structured data points.")}
                  className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 truncate max-w-[130px]"
                >
                  Methodology Nodes
                </button>
                <button
                  type="button"
                  disabled={sendingChat}
                  onClick={() => executeChatStream("Isolate and evaluate all explicit limitations, experimental constraints, and future work vectors outlined by the authors in this paper.")}
                  className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 truncate max-w-[130px]"
                >
                  Limitations & Scope
                </button>
                <button
                  type="button"
                  disabled={sendingChat}
                  onClick={() => executeChatStream("Cross-reference the central claims or technical figures in this document to evaluate if they have direct, verifiable evidence inside the text.")}
                  className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 truncate max-w-[110px]"
                >
                  Verify Evidence
                </button>
              </div>
            </div>
          )}

          {/* Chat Form Submitter */}
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2 border-t border-border p-2 bg-background">
            <Highlighter className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <input
              value={chatInput}
              disabled={!activeDoc || sendingChat}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={activeDoc ? "Ask a question..." : "Upload a paper first"}
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground disabled:opacity-50 text-foreground"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!activeDoc || !chatInput.trim() || sendingChat} 
              className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 h-7 w-7"
            >
              <Send className="size-3" />
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}

// "use client"

// import { useState, useEffect, useRef } from "react"
// import { Button } from "@/components/ui/button"
// import { extractTextFromPdf } from "@/lib/pdfWorker"
// import {
//   Search,
//   FileText,
//   Highlighter,
//   Send,
//   Sparkles,
//   UploadCloud,
//   Loader2,
//   AlertCircle,
//   FileEdit,
//   Trash2
// } from "lucide-react"
// import { supabase } from "@/lib/supabase"
// import { conceptNodesCrud, researchDocumentsCrud } from "@/lib/crud"
// import { PdfVisualViewer } from "./PdfVisualViewer"

// type DocumentRow = {
//   id: string
//   owner_id: string
//   title: string
//   file_name: string | null
//   file_url: string | null
//   file_size_bytes: number | null
//   page_count: number | null
//   extracted_text: string | null
//   keywords: string[]
//   readability_score: number | null
//   complexity_score: number | null
//   methodology_latex: string | null
//   created_at: string
// }

// type ChatMessage = {
//   id: string
//   text: string
//   isUser: boolean
// }

// export function DocumentStudio() {
//   const [documents, setDocuments] = useState<DocumentRow[]>([])
//   const [activeDoc, setActiveDoc] = useState<DocumentRow | null>(null)
//   const [loadingDocs, setLoadingDocs] = useState(true)
//   const [uploading, setUploading] = useState(false)
//   const [parsing, setParsing] = useState(false)
//   const [isActionLoading, setIsActionLoading] = useState<string | null>(null)
//   const [errorMsg, setErrorMsg] = useState("")
//   const [searchQuery, setSearchQuery] = useState("")
//   const [chatInput, setChatInput] = useState("")
//   const [sendingChat, setSendingChat] = useState(false)
//   const [documentText, setDocumentText] = useState<string>("")
  
//   const [documentSummary, setDocumentSummary] = useState<string>("")
//   const [loadingSummary, setLoadingSummary] = useState<boolean>(false)

//   const fileInputRef = useRef<HTMLInputElement>(null)

//   const [messages, setMessages] = useState<ChatMessage[]>(() => {
//     if (typeof window !== "undefined" && activeDoc?.id) {
//       const saved = localStorage.getItem(`chat_history_${activeDoc.id}`)
//       return saved ? JSON.parse(saved) : []
//     }
//     return []
//   })

//   useEffect(() => {
//     loadUserDocuments()
//   }, [])

//   const fetchDocumentSummary = async (text: string, fileName: string) => {
//     if (!text) {
//       setDocumentSummary("")
//       return
//     }
//     setLoadingSummary(true)
//     try {
//       const response = await fetch("/api/summarize", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ text, fileName }),
//       })
//       const data = await response.json()
//       setDocumentSummary(data.summary || "No summary available.")
//     } catch (err) {
//       console.error("Failed to fetch concise summary:", err)
//       setDocumentSummary("Unable to parse a dynamic summary for this asset.")
//     } finally {
//       setLoadingSummary(false)
//     }
//   }

//   useEffect(() => {
//     if (activeDoc) {
//       const textContent = activeDoc.extracted_text || ""
//       setDocumentText(textContent)
//       fetchDocumentSummary(textContent, activeDoc.file_name || activeDoc.title || "document.pdf")
      
//       const saved = localStorage.getItem(`chat_history_${activeDoc.id}`)
//       setMessages(saved ? JSON.parse(saved) : [])
//     } else {
//       setDocumentText("")
//       setDocumentSummary("")
//       setMessages([])
//     }
//   }, [activeDoc?.id])

//   useEffect(() => {
//     if (activeDoc?.id) {
//       localStorage.setItem(`chat_history_${activeDoc.id}`, JSON.stringify(messages))
//     }
//   }, [messages, activeDoc?.id])

//   const loadUserDocuments = async () => {
//     setLoadingDocs(true)
//     setErrorMsg("")
//     try {
//       const data = await researchDocumentsCrud.fetchAll() as DocumentRow[]
//       setDocuments(data)
//       if (data.length > 0 && !activeDoc) {
//         setActiveDoc(data[0])
//       }
//     } catch (err: any) {
//       console.error("Error fetching documents:", err)
//       setErrorMsg(err.message || "Failed to parse active user documentation tables.")
//     } finally {
//       setLoadingDocs(false)
//     }
//   }

//   const handleRenameDoc = async (e: React.MouseEvent, docId: string, currentTitle: string) => {
//     e.stopPropagation() 
//     const updatedName = prompt("Enter new structural name parameters for this document:", currentTitle)
//     if (!updatedName || updatedName.trim() === currentTitle) return

//     try {
//       await researchDocumentsCrud.updateById(docId, { title: updatedName.trim() })
//       setDocuments(prev => prev.map(d => d.id === docId ? { ...d, title: updatedName.trim() } : d))
//       if (activeDoc?.id === docId) {
//         setActiveDoc(prev => prev ? { ...prev, title: updatedName.trim() } : null)
//       }
//     } catch (err) {
//       console.error("Failed to execute database rename pipeline update:", err)
//     }
//   }

//   const handleDeleteDoc = async (e: React.MouseEvent, docId: string) => {
//     e.stopPropagation() 
//     if (!confirm("Are you certain you want to purge this document row out of your core schema environment?")) return

//     setIsActionLoading(docId)
//     try {
//       await researchDocumentsCrud.deleteById(docId)
//       setDocuments(prev => prev.filter(d => d.id !== docId))
//       if (activeDoc?.id === docId) {
//         const remaining = documents.filter(d => d.id !== docId)
//         setActiveDoc(remaining.length > 0 ? remaining[0] : null)
//       }
//     } catch (err) {
//       console.error("Failed to clean up database document reference entity:", err)
//     } finally {
//       setIsActionLoading(null)
//     }
//   }

//   const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0]
//     if (!file) return

//     setUploading(true)
//     setParsing(true)
//     setErrorMsg("")

//     try {
//       const { data: { user }, error: authError } = await supabase.auth.getUser()
//       if (authError || !user) throw new Error("Authentication context not found. Please log in again.")

//       let realExtractedText = ""
//       if (file.type === "application/pdf") {
//         realExtractedText = await extractTextFromPdf(file)
//       } else {
//         realExtractedText = await file.text()
//       }
      
//       setDocumentText(realExtractedText)

//       const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_")
//       const uniquePath = `${user.id}/${Date.now()}_${cleanFileName}`

//       const { error: storageError } = await supabase.storage
//         .from("documents")
//         .upload(uniquePath, file, {
//           cacheControl: "3600",
//           upsert: true,
//         })

//       if (storageError) throw storageError

//       const insertedRow = await researchDocumentsCrud.insertRecord({
//         owner_id: user.id,
//         title: file.name.replace(/\.[^/.]+$/, ""), 
//         file_name: file.name,
//         file_url: uniquePath,
//         file_size_bytes: file.size,
//         page_count: file.type === "application/pdf" ? undefined : 1, 
//         extracted_text: realExtractedText,
//         keywords: ["Academic", "Multi-Disciplinary", "Core Reference Matrix"],
//         readability_score: parseFloat((Math.random() * 30 + 40).toFixed(1)),
//         complexity_score: parseFloat((Math.random() * 20 + 60).toFixed(1)),
//         methodology_latex: "L = -\\frac{1}{N} \\sum_{i=1}^{N} [y_i \\log(\\hat{y}_i) + (1 - y_i) \\log(1 - \\hat{y}_i)] + \\lambda \\sum_{j=1}^{M} w_j^2",
//       }) as DocumentRow

//       await conceptNodesCrud.insertRecord({
//         owner_id: user.id,
//         document_id: insertedRow.id,
//         node_type: "paper",
//         label: insertedRow.title,
//       })

//       setDocuments((prev) => [insertedRow, ...prev])
//       setActiveDoc(insertedRow)
//     } catch (err: any) {
//       console.error("Upload process crashed:", err)
//       setErrorMsg(err.message || "An unexpected error occurred during document integration.")
//     } finally {
//       setUploading(false)
//       setParsing(false)
//       if (fileInputRef.current) fileInputRef.current.value = "" 
//     }
//   }

//   const executeChatStream = async (promptText: string) => {
//     if (!activeDoc || sendingChat) return

//     setSendingChat(true)
//     const userMsg: ChatMessage = {
//       id: `user-${Date.now()}`,
//       text: promptText,
//       isUser: true
//     }
//     setMessages((prev) => [...prev, userMsg])

//     try {
//       const response = await fetch("/api/chat", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           prompt: promptText,
//           formulaContext: activeDoc.methodology_latex || "",
//           documentText: documentText || activeDoc.extracted_text || ""
//         })
//       })

//       const data = await response.json()
//       if (!response.ok) throw new Error(data.error || "Failed to get reply.")

//       const realReply: ChatMessage = {
//         id: `reply-${Date.now()}`,
//         text: data.reply,
//         isUser: false
//       }
//       setMessages((prev) => [...prev, realReply])

//     } catch (err: any) {
//       console.error("Failed to fetch live AI response:", err)
//       setMessages((prev) => [...prev, {
//         id: `error-${Date.now()}`,
//         text: `Error processing query: ${err.message || "Could not connect to the API backend."}`,
//         isUser: false
//       }])
//     } finally {
//       setSendingChat(false)
//     }
//   }

//   const handleFormSubmit = (e: React.FormEvent) => {
//     e.preventDefault()
//     const prompt = chatInput.trim()
//     if (!prompt) return
//     setChatInput("")
//     executeChatStream(prompt)
//   }

//   const filteredDocs = documents.filter(doc => 
//     doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase())
//   )

//   return (
//     <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-12 lg:p-5 items-start">
      
//       {/* ==================== LEFT: MAIN READING CANVAS (7/12 WIDTH) ==================== */}
//       <section className="flex flex-col rounded-xl border border-border bg-card overflow-hidden lg:col-span-7 h-full">
//         {/* Document Action Headers & Selection Row */}
//         <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 bg-background">
//           <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
//             <Search className="size-4 text-muted-foreground" aria-hidden="true" />
//             <input
//               placeholder="Search documents by keyword..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
//             />
//           </div>
          
//           <input 
//             type="file" 
//             ref={fileInputRef}
//             onChange={handleFileUpload}
//             accept="application/pdf,text/plain"
//             className="hidden" 
//           />
          
//           <Button 
//             onClick={() => fileInputRef.current?.click()} 
//             disabled={uploading || parsing} 
//             size="sm" 
//             className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
//           >
//             {uploading || parsing ? (
//               <>
//                 <Loader2 className="size-4 animate-spin" />
//                 Processing PDF...
//               </>
//             ) : (
//               <>
//                 <UploadCloud className="size-4" />
//                 Upload Paper
//               </>
//             )}
//           </Button>
//         </div>

//         {errorMsg && (
//           <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
//             <AlertCircle className="size-4 shrink-0" />
//             <span>{errorMsg}</span>
//           </div>
//         )}

//         {/* Real-time Document selector rack */}
//         <div className="border-b border-border bg-muted/20">
//           <div className="px-4 pt-3 pb-1">
//             <h4 className="text-xs font-bold text-foreground tracking-wide">Documents</h4>
//           </div>

//           <div className="flex flex-col gap-1 p-3 max-h-[160px] overflow-y-auto">
//             {loadingDocs ? (
//               <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground justify-center">
//                 <Loader2 className="size-3.5 animate-spin text-primary" /> Fetching platform resources...
//               </div>
//             ) : filteredDocs.length === 0 ? (
//               <p className="text-xs text-muted-foreground italic py-2 text-center">No research papers uploaded yet.</p>
//             ) : (
//               filteredDocs.map((doc) => {
//                 const isActive = activeDoc?.id === doc.id
//                 return (
//                   <div
//                     key={doc.id}
//                     onClick={() => setActiveDoc(doc)}
//                     className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all border ${
//                       isActive
//                         ? "bg-primary text-primary-foreground border-primary shadow-sm"
//                         : "bg-card text-foreground hover:bg-muted/60 border-border/70"
//                     }`}
//                   >
//                     <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
//                       <FileText className={`size-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
//                       <span className="truncate">{doc.title || doc.file_name}</span>
//                     </div>

//                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
//                       <button
//                         type="button"
//                         onClick={(e) => handleRenameDoc(e, doc.id, doc.title || "")}
//                         className={`p-1 rounded-md transition-colors ${isActive ? "hover:bg-primary-foreground/20 text-primary-foreground/90" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
//                       >
//                         <FileEdit className="size-3.5" />
//                       </button>
//                       <button
//                         type="button"
//                         disabled={isActionLoading === doc.id}
//                         onClick={(e) => handleDeleteDoc(e, doc.id)}
//                         className={`p-1 rounded-md transition-colors ${isActive ? "hover:bg-primary-foreground/20 text-primary-foreground/90" : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"}`}
//                       >
//                         {isActionLoading === doc.id ? (
//                           <Loader2 className="size-3.5 animate-spin" />
//                         ) : (
//                           <Trash2 className="size-3.5" />
//                         )}
//                       </button>
//                     </div>
//                   </div>
//                 )
//               })
//             )}
//           </div>
//         </div>

//         {/* Visual Render Canvas Frame */}
//         <div className="flex-1 p-4 bg-background">
//           {activeDoc ? (
//             <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
//               <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
//                 Visual Render Sandbox · Canvas Document Framework
//               </p>
//               <h3 className="mb-3 text-balance text-base font-semibold text-foreground">
//                 {activeDoc.title}
//               </h3>
              
//               <div className="border-t border-border/40 pt-3">
//                 <PdfVisualViewer fileUrl={activeDoc.file_url} />
//               </div>
//             </div>
//           ) : (
//             <div className="flex h-[55vh] flex-col items-center justify-center p-8 text-center text-muted-foreground">
//               <UploadCloud className="size-12 stroke-1 mb-2 text-muted-foreground/60" />
//               <p className="text-sm font-medium">Your Academic Sandbox is empty</p>
//               <p className="text-xs max-w-xs mt-1">Upload research documents above to spin up the text extractors.</p>
//             </div>
//           )}
//         </div>
//       </section>

//       {/* ==================== RIGHT: STACKED METRIC & ANALYSIS SIDEBAR (5/12 WIDTH) ==================== */}
//       <section className="flex flex-col gap-4 lg:col-span-5 h-full">
        
//         {/* 1. Single File Metric Matrix (Top) */}
//         <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
//           <p className="mb-3 text-sm font-semibold text-card-foreground">Single-File Metric Matrix</p>
//           <div className="grid grid-cols-3 gap-3">
//             {[
//               ["File Size", activeDoc?.file_size_bytes != null ? `${(activeDoc.file_size_bytes / 1024).toFixed(1)} KB` : "—"],
//               ["Confidence Level", activeDoc ? "p < 0.01" : "—"],
//               ["Readability Score", activeDoc?.readability_score != null ? `${activeDoc.readability_score}%` : "—"],
//               ["Estimated Pages", activeDoc?.page_count != null ? `n = ${activeDoc.page_count}` : "—"],
//               ["Complexity Tier", activeDoc?.complexity_score != null ? `${activeDoc.complexity_score}%` : "—"],
//               ["Keywords Found", activeDoc?.keywords ? String(activeDoc.keywords.length) : "—"],
//             ].map(([l, v]) => (
//               <div key={l} className="rounded-lg border border-border bg-background p-2.5">
//                 <p className="text-[11px] text-muted-foreground">{l}</p>
//                 <p className="mt-0.5 font-mono text-xs font-semibold text-foreground">{v}</p>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* 2. Extracted Text Concise Summary (Middle Stack) */}
//         {activeDoc && (
//           <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-xs">
//             <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">
//               Extracted Text Stream · Concise Summary
//             </p>
//             {loadingSummary ? (
//               <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
//                 <Loader2 className="size-3.5 animate-spin text-primary" /> Building cross-disciplinary summary matrix...
//               </div>
//             ) : (
//               <p className="text-xs font-medium text-foreground leading-relaxed">
//                 {documentSummary || "No summary parameters structured yet for this asset."}
//               </p>
//             )}
//           </div>
//         )}

//         {/* 3. Source-Grounded Interaction Chat Studio (Bottom Stack) */}
//         <div className="flex flex-1 flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm min-h-[350px]">
//           <div className="flex items-center justify-between border-b border-border p-3 bg-muted/20">
//             <div className="flex items-center gap-2">
//               <Sparkles className="size-4 text-primary" aria-hidden="true" />
//               <p className="text-sm font-semibold text-card-foreground">Source-Grounded Interaction Chat Studio</p>
//             </div>
//             {messages.length > 0 && (
//               <Button 
//                 variant="ghost" 
//                 size="sm" 
//                 onClick={() => {
//                   setMessages([])
//                   if (activeDoc?.id) localStorage.removeItem(`chat_history_${activeDoc.id}`)
//                 }}
//                 className="text-[11px] h-6 px-2 text-muted-foreground hover:text-destructive transition-colors"
//               >
//                 Clear Thread
//               </Button>
//             )}
//           </div>

//           {/* Dynamic Message Stream Area */}
//           <div className="flex-1 space-y-4 overflow-y-auto p-4 max-h-[320px]">
//             {activeDoc ? (
//               messages.map((m) => (
//                 <div key={m.id} className={`flex ${m.isUser ? "justify-end" : "justify-start"}`}>
//                   <div className="flex items-start gap-2 max-w-[85%]">
//                     {!m.isUser && (
//                       <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground mt-0.5">
//                         <Sparkles className="size-3.5" aria-hidden="true" />
//                       </div>
//                     )}
//                     <div
//                       className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
//                         m.isUser
//                           ? "bg-primary text-primary-foreground rounded-br-sm"
//                           : "border border-border bg-background text-foreground rounded-tl-sm shadow-xs"
//                       }`}
//                     >
//                       {m.isUser ? (
//                         m.text
//                       ) : (
//                         <div className="space-y-2 text-foreground">
//                           {m.text.split("\n").map((line, lineIndex) => {
//                             let content = line.trim()
//                             if (!content) return <div key={lineIndex} className="h-2" />

//                             if (content.startsWith("###")) {
//                               return (
//                                 <h4 key={lineIndex} className="text-sm font-bold text-foreground mt-2 mb-1">
//                                   {content.replace(/^###\s*/, "")}
//                                 </h4>
//                               )
//                             }

//                             const boldSegments = line.split(/(\*\*.*?\*\*)/g)
//                             return (
//                               <p key={lineIndex} className="text-xs md:text-sm">
//                                 {boldSegments.map((seg, segIndex) => {
//                                   if (seg.startsWith("**") && seg.endsWith("**")) {
//                                     return (
//                                       <strong key={segIndex} className="font-semibold text-primary">
//                                         {seg.slice(2, -2)}
//                                       </strong>
//                                     )
//                                   }
//                                   return <span key={segIndex}>{seg}</span>
//                                 })}
//                               </p>
//                             )
//                           })}
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))
//             ) : (
//               <p className="text-center text-xs text-muted-foreground italic pt-12">
//                 Select or upload a document to activate the AI analysis chat stream.
//               </p>
//             )}
            
//             {sendingChat && (
//               <div className="flex justify-start items-center gap-2 text-xs text-muted-foreground italic px-9">
//                 <Loader2 className="size-3 animate-spin text-primary" /> Processing logic blocks...
//               </div>
//             )}
//           </div>

//           {/* Context Trigger Footer Quick Action Buttons */}
//           {activeDoc && (
//             <div className="px-3 py-2 bg-muted/20 border-t border-border/60">
//               <div className="flex flex-wrap gap-1.5">
//                 <button
//                   type="button"
//                   disabled={sendingChat}
//                   onClick={() => executeChatStream("Scan the uploaded research document text and extract the core methodology parameters, prerequisites, and literature gaps as structured data points.")}
//                   className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
//                 >
//                   Extract Methodology Nodes
//                 </button>
//                 <button
//                   type="button"
//                   disabled={sendingChat}
//                   onClick={() => executeChatStream("Isolate and evaluate all explicit limitations, experimental constraints, and future work vectors outlined by the authors in this paper.")}
//                   className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
//                 >
//                   Summarize Limitations & Scope
//                 </button>
//                 <button
//                   type="button"
//                   disabled={sendingChat}
//                   onClick={() => executeChatStream("Cross-reference the central claims or technical figures in this document to evaluate if they have direct, verifiable evidence inside the text.")}
//                   className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
//                 >
//                   Verify Evidence Matrix
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* Live Command Text Submission Form */}
//           <form onSubmit={handleFormSubmit} className="flex items-center gap-2 border-t border-border p-3 bg-background">
//             <Highlighter className="size-4 text-muted-foreground" aria-hidden="true" />
//             <input
//               value={chatInput}
//               disabled={!activeDoc || sendingChat}
//               onChange={(e) => setChatInput(e.target.value)}
//               placeholder={activeDoc ? "Ask a source-grounded question..." : "Upload a paper first to interact"}
//               className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground disabled:opacity-50 text-foreground"
//             />
//             <Button 
//               type="submit" 
//               size="icon" 
//               disabled={!activeDoc || !chatInput.trim() || sendingChat} 
//               className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 h-8 w-8"
//             >
//               <Send className="size-3.5" />
//             </Button>
//           </form>
//         </div>
//       </section>
//     </div>
//   )
// }