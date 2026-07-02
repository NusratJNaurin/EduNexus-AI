"use client"

import { useState, useEffect, useRef, useMemo } from "react"
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
  Trash2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { conceptNodesCrud, researchDocumentsCrud } from "@/lib/crud"
import { postAnalyzeDependencies, postChat, postInferDependencies, postSummarize } from "@/lib/api-client"
import { usePersistedMessages } from "@/hooks/use-api"
import type { ChatMessage, ConceptNodeType, DependencyEdge, ResearchDocumentRow } from "@/lib/types"
import { PdfVisualViewer } from "./PdfVisualViewer"
import { toast } from "sonner"
import { z } from "zod"
import { nodeTypeUpdateSchema } from "@/lib/api/validation" 
export type NodeTypeUpdate = z.infer<typeof nodeTypeUpdateSchema>
import { conceptEdgesCrud } from "@/lib/crud"

interface DocumentStudioProps { onNodesUpdated?: () => void }

// Fallback keyword detector for instantaneous layout indexing before dynamic AI categorization runs
function detectKeywords(text: string): string[] {
  const lowerText = text.toLowerCase()
  const detectedKeywords: string[] = []
  if (lowerText.includes("vector") || lowerText.includes("coordinate") || lowerText.includes("axis")) {
    detectedKeywords.push("Vectors")
  }
  if (lowerText.includes("motion") || lowerText.includes("velocity") || lowerText.includes("acceleration")) {
    detectedKeywords.push("Kinematics")
  }
  if (lowerText.includes("array") || lowerText.includes("object") || lowerText.includes("static")) {
    detectedKeywords.push("Data Structures")
  }
  if (detectedKeywords.length === 0) detectedKeywords.push("General Reference")
  return detectedKeywords
}

function computeReadabilityScore(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1
  const avgWordsPerSentence = words / sentences
  return parseFloat(Math.min(95, Math.max(35, 100 - avgWordsPerSentence * 1.2)).toFixed(1))
}

function computeComplexityScore(text: string, pageCount: number): number {
  const uniqueTerms = new Set(text.toLowerCase().match(/\b[a-z]{6,}\b/g) ?? []).size
  const density = uniqueTerms / Math.max(pageCount, 1)
  return parseFloat(Math.min(95, Math.max(45, 50 + density * 2)).toFixed(1))
}

export function DocumentStudio({ onNodesUpdated }: DocumentStudioProps) {
  const [documents, setDocuments] = useState<ResearchDocumentRow[]>([])
  const [activeDoc, setActiveDoc] = useState<ResearchDocumentRow | null>(null)
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [chatInput, setChatInput] = useState("")
  const [sendingChat, setSendingChat] = useState(false)
  const [documentText, setDocumentText] = useState("")
  const [documentSummary, setDocumentSummary] = useState("")
  const [loadingSummary, setLoadingSummary] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatStorageKey = activeDoc?.id ? `chat_history_${activeDoc.id}` : null
  const { loadMessages, saveMessages, clearMessages } = usePersistedMessages(chatStorageKey)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    void loadUserDocuments()
  }, [])

  useEffect(() => {
    if (!activeDoc) {
      setDocumentText("")
      setDocumentSummary("")
      setMessages([])
      return
    }

    const textContent = activeDoc.extracted_text ?? ""
    setDocumentText(textContent)
    setMessages(loadMessages())
    void fetchDocumentSummary(textContent, activeDoc.file_name ?? activeDoc.title ?? "document.pdf", activeDoc.id)
  }, [activeDoc?.id, loadMessages])

  useEffect(() => {
    if (activeDoc?.id) {
      saveMessages(messages)
    }
  }, [messages, activeDoc?.id, saveMessages])

  const fetchDocumentSummary = async (text: string, fileName: string, docId: string) => {
    if (!text) {
      setDocumentSummary("")
      return
    }

    const cachedSummary = localStorage.getItem(`summary_${docId}`)
    if (cachedSummary) {
      setDocumentSummary(cachedSummary)
      return
    }

    setLoadingSummary(true)
    try {
      // Truncate text to 49000 chars to safely satisfy the API schema's max(50000) constraint
      const safeText = text.slice(0, 49000)
      const data = await postSummarize({ text: safeText, fileName })
      setDocumentSummary(data.summary)
      localStorage.setItem(`summary_${docId}`, data.summary)
    } catch (err) {
      console.error("Failed to fetch concise summary:", err)
      const message = err instanceof Error ? err.message : ""
      if (message.includes("temporarily busy") || message.includes("Service Unavailable")) {
        toast.warning("The AI engine is temporarily busy. Please try generating your summary again in a moment")
      }
      setDocumentSummary("Unable to parse a dynamic summary for this asset.")
    } finally {
      setLoadingSummary(false)
    }
  }

  const loadUserDocuments = async () => {
    setLoadingDocs(true)
    setErrorMsg("")
    try {
      const data = await researchDocumentsCrud.fetchAll()
      setDocuments(data)
      if (data.length > 0) {
        setActiveDoc((current) => current ?? data[0])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load documents."
      setErrorMsg(message)
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
      setDocuments((prev) => prev.map((doc) => (doc.id === docId ? { ...doc, title: updatedName.trim() } : doc)))
      if (activeDoc?.id === docId) {
        setActiveDoc((prev) => (prev ? { ...prev, title: updatedName.trim() } : null))
      }
    } catch (err) {
      console.error("Failed to rename document:", err)
    }
  }

  const handleDeleteDoc = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    if (!confirm("Are you certain you want to delete this document and its linked concept nodes?")) return

    setIsActionLoading(docId)
    try {
      const userNodes = await conceptNodesCrud.fetchAll()
      const matchingNode = userNodes.find((node) => node.document_id === docId)
      if (matchingNode) {
        await conceptNodesCrud.deleteById(matchingNode.id)
      }

      await researchDocumentsCrud.deleteById(docId)
      localStorage.removeItem(`summary_${docId}`)
      localStorage.removeItem(`chat_history_${docId}`)

      setDocuments((prev) => {
        const remaining = prev.filter((doc) => doc.id !== docId)
        if (activeDoc?.id === docId) {
          setActiveDoc(remaining.length > 0 ? remaining[0] : null)
        }
        return remaining
      })

      if (onNodesUpdated) {
        onNodesUpdated()
      }
    } catch (err) {
      console.error("Failed to delete document:", err)
    } finally {
      setIsActionLoading(null)
    }
  }

  const organizationalTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    return () => {
      if (organizationalTimerRef.current) {
        clearTimeout(organizationalTimerRef.current);
      }
    };
  }, []);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setParsing(true)
    setErrorMsg("")

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Authentication context not found. Please log in again.")

      let realExtractedText = ""
      let totalPages = 0

      if (file.type === "application/pdf") {
        const pdfData = await extractTextFromPdf(file)
        realExtractedText = pdfData.text
        totalPages = pdfData.pageCount
      } else {
        realExtractedText = await file.text()
      }

      setDocumentText(realExtractedText)

      // 0. Upload the actual PDF file to Supabase Storage so PdfVisualViewer can display it
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_")
      const storagePath = `${user.id}/${Date.now()}_${cleanFileName}`
      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, { cacheControl: "3600", upsert: true })
      if (storageError) throw storageError

      // Ensure we fallback safely if text extraction returned blank characters
      const cleanSnippet = realExtractedText.trim() 
        ? realExtractedText.slice(0, 4000) 
        : "No extractable semantic text found in PDF layout metadata."

      // 1. Compute foundational research score models locally
      const baseKeywords = detectKeywords(realExtractedText)
      const mockReadability = computeReadabilityScore(realExtractedText)
      const mockComplexity = computeComplexityScore(realExtractedText, totalPages || 1)

      // 2. Save the incoming uploaded Research Document to Supabase using .insertRecord
      //    file_url stores the storage path so PdfVisualViewer can resolve it to a signed URL
      const newDocRecord = await researchDocumentsCrud.insertRecord({
        owner_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        file_name: file.name,
        file_url: storagePath,
        file_size_bytes: file.size,
        extracted_text: realExtractedText,
        page_count: totalPages || 1,
        complexity_score: mockComplexity,
        readability_score: mockReadability
      })

      // 3. Transform the document into a base core Node for your graph view using .insertRecord
      const targetGraphNode = await conceptNodesCrud.insertRecord({
        owner_id: user.id,
        document_id: newDocRecord.id,
        label: newDocRecord.title,
        node_type: "paper", // Default base classification
        keywords: baseKeywords,
        summary: "Analyzing contextual concept layout..."
      })

      // 3a. Fetch AI-generated structured metadata via the summarize API
      let metadataSummary = "Analyzing contextual concept layout..."
      let mainConcepts: string[] = []
      let prerequisiteConcepts: string[] = []
      let learningObjectives: string[] = []
      let isKnowledgeBearing = false

      try {
        const safeText = realExtractedText.slice(0, 49000)
        const summarizeResult = await postSummarize({
          text: safeText,
          fileName: newDocRecord.file_name ?? newDocRecord.title ?? "document.pdf",
        })
        metadataSummary = summarizeResult.summary
        mainConcepts = summarizeResult.main_concepts ?? []
        prerequisiteConcepts = summarizeResult.prerequisite_concepts ?? []
        learningObjectives = summarizeResult.learning_objectives ?? []
        isKnowledgeBearing = summarizeResult.is_knowledge_bearing
      } catch (summarizeErr) {
        console.error("Structured metadata extraction failed:", summarizeErr)
      }

      // 3b. Update the concept node with structured metadata from AI
      await conceptNodesCrud.updateById(targetGraphNode.id, {
        summary: metadataSummary,
        main_concepts: mainConcepts,
        prerequisite_concepts: prerequisiteConcepts,
        learning_objectives: learningObjectives,
        is_knowledge_bearing: isKnowledgeBearing,
      })

      // 3c. If the document is knowledge-bearing, infer dependency edges automatically
      if (isKnowledgeBearing && prerequisiteConcepts.length > 0) {
        try {
          const inferenceResult = await postInferDependencies({
            newNodeId: targetGraphNode.id,
            prerequisiteConcepts,
          })
          console.log(`[Dependency Inference] Created ${inferenceResult.edges.length} prerequisite edge(s)`)
        } catch (inferErr) {
          console.error("Dependency inference failed:", inferErr)
        }
      }

      // 4. Query all existing context nodes currently stored in your system
      const existingSystemNodes = await conceptNodesCrud.fetchAll()
      
      // Filter out our newly created node so the AI does not try to connect a paper to itself
      const comparisonNodes = existingSystemNodes.filter(node => node.id !== targetGraphNode.id)

      if (comparisonNodes.length > 0) {
        // 5. Fire off the structured request to your patched dependency matching route!
        const aiDependencyResult = await postAnalyzeDependencies({
          newDoc: {
            id: targetGraphNode.id,
            title: targetGraphNode.label,
            keywords: baseKeywords,
            textSnippet: cleanSnippet
          },
          existingNodes: comparisonNodes.map(node => ({
            id: node.id,
            label: node.label,
            node_type: node.node_type as ConceptNodeType,
            keywords: node.keywords || [],
            summary: node.summary || ""
          }))
        })

        // 6. Loop through and save every academically defensible relationship edge returned by Gemini
        if (aiDependencyResult.newEdges && aiDependencyResult.newEdges.length > 0) {
          for (const edge of aiDependencyResult.newEdges) {
            await conceptEdgesCrud.insertRecord({
              owner_id: user.id,
              source_node_id: edge.source_node_id,
              target_node_id: edge.target_node_id,
              relationship_type: edge.relationship_type as DependencyEdge["relationship_type"],
              justification: edge.justification
            })
          }
        }

        // 7. Handle any contextual structural classification changes (e.g. upgrading node types)
        if (aiDependencyResult.newNodeType && aiDependencyResult.newNodeType !== "paper") {
          await conceptNodesCrud.updateById(targetGraphNode.id, {
            node_type: aiDependencyResult.newNodeType
          })
        }
      }

      // 8. Sync state elements and notify your graph rendering canvas to redraw lines
      await loadUserDocuments()
      if (onNodesUpdated) {
        onNodesUpdated()
      }

    } catch (err) {
      console.error("Critical upload and link matching pipeline failure:", err)
      setErrorMsg(err instanceof Error ? err.message : "Failed to execute complete document processing pipeline.")
    } finally {
      setUploading(false)
      setParsing(false)
    }
    }


  // const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0]
  //   if (!file) 
  //     return

  //   setUploading(true)
  //   setParsing(true)
  //   setErrorMsg("")

  //   try {
  //     const {
  //       data: { user },
  //       error: authError,
  //     } = await supabase.auth.getUser()
  //     if (authError || !user) throw new Error("Authentication context not found. Please log in again.")

  //     let realExtractedText = ""
  //     let totalPages = 0

  //     if (file.type === "application/pdf") {
  //       const pdfData = await extractTextFromPdf(file)
  //       realExtractedText = pdfData.text
  //       totalPages = pdfData.pageCount
  //     } else {
  //       realExtractedText = await file.text()
  //     }

  //     setDocumentText(realExtractedText)

  //     const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_")
  //     const uniquePath = `${user.id}/${Date.now()}_${cleanFileName}`

  //     const { error: storageError } = await supabase.storage
  //       .from("documents")
  //       .upload(uniquePath, file, { cacheControl: "3600", upsert: true })

  //     if (storageError) 
  //       throw storageError

  //     const detectedKeywords = detectKeywords(realExtractedText)

  //     // 1. Immediately insert document record
  //     const insertedRow = await researchDocumentsCrud.insertRecord({
  //       owner_id: user.id,
  //       title: file.name.replace(/\.[^/.]+$/, ""),
  //       file_name: file.name,
  //       file_url: uniquePath,
  //       file_size_bytes: file.size,
  //       page_count: totalPages,
  //       extracted_text: realExtractedText,
  //       keywords: detectedKeywords,
  //       readability_score: computeReadabilityScore(realExtractedText),
  //       complexity_score: computeComplexityScore(realExtractedText, totalPages),
  //     })

  //     // 2. Immediately insert baseline paper node so the UI canvas grid remains reactive
  //     await conceptNodesCrud.insertRecord({
  //       owner_id: user.id,
  //       document_id: insertedRow.id,
  //       node_type: "paper",
  //       label: insertedRow.title,
  //       position_x: 250,
  //       position_y: 200,
  //     })

  //     // Pull fresh local records to display the newly added node right away
  //     await loadUserDocuments()
  //     if (onNodesUpdated) {
  //       onNodesUpdated()
  //     }

  //     // 3. SLIDING TIMER DEBOUNCE BLOCK FOR BACKSTAGE METHODOLOGY LAYOUT ANALYSIS
  //     if (organizationalTimerRef.current) {
  //       console.log("Resetting 30s background AI window due to active file upload activity...")
  //       clearTimeout(organizationalTimerRef.current)
  //     }

  //     organizationalTimerRef.current = setTimeout(async () => {
  //       console.log("User inactive for 30s. Starting deferred background graph analysis...")
        
  //       // CRITICAL FIX: Capture user.id BEFORE async operations to preserve auth context
  //       const capturedUserId = user.id
        
  //       try {
  //         const freshNodes = await conceptNodesCrud.fetchAll()
  //         const userNodes = freshNodes.filter((node) => node.owner_id === capturedUserId)

  //         // Confirm complementary records exist before triggering relational evaluations
  //         if (userNodes.length <= 1) {
  //           console.log("Skipping edge analysis: only 1 node exists")
  //           return
  //         }

  //         const allDocs = await researchDocumentsCrud.fetchAll()
  //         const decisions = await postAnalyzeDependencies({
  //           newDoc: {
  //             title: insertedRow.title,
  //             keywords: detectedKeywords,
  //             textSnippet: realExtractedText.length > 2300 
  //               ? realExtractedText.slice(300, 2300)
  //               : realExtractedText.slice(300),
  //           },
  //           existingNodes: userNodes.map((node) => {
  //             return {
  //               id: node.id,
  //               label: node.label,
  //               node_type: node.node_type,
  //               keywords: allDocs.find((d) => d.id === node.document_id)?.keywords || [],
  //               summary: allDocs.find((d) => d.id === node.document_id)?.extracted_text?.slice(0, 500) || "",
  //             }
  //           }),
  //         })

  //         const targetUploadedNode = userNodes.find((n) => n.document_id === insertedRow.id)
          
  //         console.log("🔍 AI Dependency Analysis Results:", {
  //           newEdgesCount: decisions.newEdges?.length || 0,
  //           targetNodeFound: !!targetUploadedNode,
  //           targetNodeId: targetUploadedNode?.id,
  //         })
          
  //         if (targetUploadedNode && decisions.newEdges) {
  //           for (const edge of decisions.newEdges) {
  //             try {
  //               // CRITICAL FIX: Use AI-provided source_node_id instead of hardcoding targetUploadedNode
  //               const edgePayload = {
  //                 owner_id: capturedUserId,
  //                 source_node_id: edge.source_node_id,
  //                 target_node_id: edge.target_node_id,
  //                 relationship_type: edge.relationship_type,
  //                 justification: edge.justification || null,
  //               }
                
  //               console.log("📤 Attempting edge insert with payload:", edgePayload)
                
  //               const insertedEdge = await conceptEdgesCrud.insertRecord(edgePayload)
                
  //               console.log("✅ Edge inserted successfully:", insertedEdge.id)
  //             } catch (edgeError) {
  //               // CRITICAL FIX: Enhanced error logging with full details
  //               console.error("❌ EDGE INSERT FAILED:", {
  //                 error: edgeError,
  //                 errorMessage: edgeError instanceof Error ? edgeError.message : String(edgeError),
  //                 errorStack: edgeError instanceof Error ? edgeError.stack : undefined,
  //                 attemptedPayload: {
  //                   owner_id: capturedUserId,
  //                   source_node_id: edge.source_node_id,
  //                   target_node_id: edge.target_node_id,
  //                   relationship_type: edge.relationship_type,
  //                 },
  //               })
  //             }
  //           }
  //         }

  //         await loadUserDocuments()
  //         if (onNodesUpdated) {
  //           onNodesUpdated()
  //         }
  //         console.log("✅ AI background graph layout optimization complete.")
  //       } catch (aiError) {
  //         console.error("❌ AI background dependency analysis failed:", {
  //           error: aiError,
  //           errorMessage: aiError instanceof Error ? aiError.message : String(aiError),
  //           errorStack: aiError instanceof Error ? aiError.stack : undefined,
  //         })
  //       }
  //     }, 30000)

  //   } catch (err) {
  //     const message = err instanceof Error ? err.message : "An unexpected error occurred during document integration."
  //     setErrorMsg(message)
  //   } finally {
  //     setUploading(false)
  //     setParsing(false)
  //     if (fileInputRef.current) fileInputRef.current.value = ""
  //   }
  // }
  
  const executeChatStream = async (promptText: string) => {
    if (!activeDoc || sendingChat) return

    setSendingChat(true)
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text: promptText,
      isUser: true,
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const data = await postChat({
        prompt: promptText,
        formulaContext: activeDoc.methodology_latex ?? "",
        documentText: documentText || activeDoc.extracted_text || "",
      })

      const realReply: ChatMessage = {
        id: `reply-${Date.now()}`,
        text: data.reply,
        isUser: false,
      }
      setMessages((prev) => [...prev, realReply])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not connect to the API backend."
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          text: `Error processing query: ${message}`,
          isUser: false,
        },
      ])
    } finally {
      setSendingChat(false)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const prompt = chatInput.trim()
    if (!prompt) return
    setChatInput("")
    void executeChatStream(prompt)
  }

  const filteredDocs = useMemo(
    () =>
      documents.filter(
        (doc) =>
          doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [documents, searchQuery],
  )

  return (
    <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-12 lg:p-5 items-start">
      <section className="flex flex-col rounded-xl border border-border bg-card overflow-hidden lg:col-span-8">
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
                        {isActionLoading === doc.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="p-3 bg-background">
          {activeDoc ? (
            <div className="flex flex-col rounded-xl border border-border/80 bg-card p-3 shadow-xs min-h-[600px]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Visual Render Sandbox · Canvas Document Framework
                </p>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{activeDoc.title}</h3>
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

      <section className="flex flex-col gap-4 lg:col-span-4">
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
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-background p-2">
                <p className="text-[10px] text-muted-foreground truncate">{label}</p>
                <p className="mt-0.5 font-mono text-[11px] font-semibold text-foreground truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>

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
                  clearMessages()
                }}
                className="text-[10px] h-5 px-1.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-3 max-h-[400px]">
            {activeDoc ? (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                  <div className="flex items-start gap-1.5 max-w-[90%]">
                    {!message.isUser && (
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground mt-0.5">
                        <Sparkles className="size-3" aria-hidden="true" />
                      </div>
                    )}
                    <div
                      className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        message.isUser
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "border border-border bg-background text-foreground rounded-tl-sm shadow-xs"
                      }`}
                    >
                      {message.text}
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

          {activeDoc && (
            <div className="px-2 py-1.5 bg-muted/20 border-t border-border/60">
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  disabled={sendingChat}
                  onClick={() =>
                    void executeChatStream(
                      "Scan the uploaded research document text and extract the core methodology parameters, prerequisites, and literature gaps as structured data points.",
                    )
                  }
                  className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 truncate max-w-[130px]"
                >
                  Methodology Nodes
                </button>
                <button
                  type="button"
                  disabled={sendingChat}
                  onClick={() =>
                    void executeChatStream(
                      "Isolate and evaluate all explicit limitations, experimental constraints, and future work vectors outlined by the authors in this paper.",
                    )
                  }
                  className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 truncate max-w-[130px]"
                >
                  Limitations & Scope
                </button>
                <button
                  type="button"
                  disabled={sendingChat}
                  onClick={() =>
                    void executeChatStream(
                      "Cross-reference the central claims or technical figures in this document to evaluate if they have direct, verifiable evidence inside the text.",
                    )
                  }
                  className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 truncate max-w-[110px]"
                >
                  Verify Evidence
                </button>
              </div>
            </div>
          )}

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