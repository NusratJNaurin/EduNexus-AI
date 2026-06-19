"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { 
  Mic, 
  MicOff, 
  Radio, 
  CircleDot, 
  FileText, 
  Lightbulb, 
  Layers, 
  Sparkles, 
  Highlighter, 
  Send, 
  Loader2,
  X,
  Info 
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { supabase } from "@/lib/supabase"
import { conceptNodesCrud } from "@/lib/crud"

type FeedbackItem = {
  t: string
  q: boolean
  text: string
}

type Node = {
  id: string
  owner_id: string
  x: number
  y: number
  label: string
  node_type: "paper" | "prerequisite" | "research_gap"
  viva_feedback?: FeedbackItem[]
}

type DocumentRow = {
  id: string
  title: string
}

const STATIC_EDGES: [string, string][] = [
  ["core", "p1"],
  ["core", "p2"],
  ["core", "pre1"],
  ["core", "pre2"],
  ["core", "gap2"],
]

export function MethodologyGraph() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [activeDoc, setActiveDoc] = useState<DocumentRow | null>(null)
  
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  const [messages, setMessages] = useState<{ id: string; text: string; isUser: boolean }[]>([
    { id: "init", text: "Welcome to the Methodology Graph Workspace terminal. Select a concept node or interact below.", isUser: false }
  ])
  const [chatInput, setChatInput] = useState("")
  const [sendingChat, setSendingChat] = useState(false)

  const [showScoreModal, setShowScoreModal] = useState(false)
  const [newQuestion, setNewQuestion] = useState("")
  const [newAnswer, setNewAnswer] = useState("")
  const [savingScore, setSavingScore] = useState(false)

  // Define your screen dimensions and padding
  const width = 800;  // Replace with your actual width
  const height = 600; // Replace with your actual height
  const padding = 40; // Keeps nodes away from the very edge
  const cx = width / 2;
  const cy = height / 2;
  const spacing = 30; 

  useEffect(() => {
    fetchGraphData()
  }, [])

  const fetchGraphData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const allRecords = await conceptNodesCrud.fetchAll() as any[]
      
      const userNodes: Node[] = allRecords
        .filter((item) => item.owner_id === user.id)
        .map((item, idx) => ({
          id: item.id,
          owner_id: item.owner_id,
          x: item.x ?? (idx === 0 ? cx : Math.min(width - padding, Math.max(padding, cx + Math.cos(idx * 2.4) * (Math.sqrt(idx) * spacing)))),
          y: item.y ?? (idx === 0 ? cy : Math.min(height - padding, Math.max(padding, cy + Math.sin(idx * 2.4) * (Math.sqrt(idx) * spacing)))),
          label: item.label || "Unnamed Concept Parameter",
          node_type: item.node_type || "paper",
          viva_feedback: item.viva_feedback || [] 
        }))

      setNodes(userNodes)
      if (userNodes.length > 0) {
        setSelectedNode((prev) => {
          const fresh = userNodes.find((n) => n.id === prev?.id)
          return fresh || userNodes[0]
        })
      }
    } catch (err) {
      console.error("Failed to compile methodology nodes:", err)
    } finally {
      setLoading(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        await handleProcessAudioDefense(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setRecording(true)
    } catch (err) {
      console.error("Microphone hardware access denied:", err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const handleProcessAudioDefense = async (audioBlob: Blob) => {
    if (!selectedNode) return

    const loadingTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    
    setNodes(prevNodes => prevNodes.map(n => {
      if (n.id === selectedNode.id) {
        return {
          ...n,
          viva_feedback: [
            ...(n.viva_feedback || []),
            { t: loadingTimestamp, q: true, text: "Processing your audio response..." }
          ]
        }
      }
      return n
    }))

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "defense-audio.webm")
      formData.append("nodeLabel", selectedNode.label)
      formData.append("nodeType", selectedNode.node_type)

      const response = await fetch("/api/viva", {
        method: "POST",
        body: formData
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed extraction")

      const currentLogs = selectedNode.viva_feedback || []
      const finalTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      
      const updatedLogs: FeedbackItem[] = [
        ...currentLogs.filter(log => log.text !== "Processing your audio response..."),
        { t: finalTimestamp, q: true, text: data.transcription || "Audio recorded successfully." },
        { t: finalTimestamp, q: false, text: data.evaluation || "Evaluation could not compile." }
      ]

      await conceptNodesCrud.updateById(selectedNode.id, {
        viva_feedback: updatedLogs
      })

      await fetchGraphData()
    } catch (err) {
      console.error("Viva validation processing route crash:", err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const userMsg = { id: String(Date.now()), text: chatInput, isUser: true }
    setMessages((prev) => [...prev, userMsg])
    const promptSnapshot = chatInput
    setChatInput("")

    const loadingId = "loading-placeholder"
    setMessages((prev) => [...prev, { id: loadingId, text: "Consulting AI model engine...", isUser: false }])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptSnapshot,
          formulaContext: selectedNode ? `Context Node Label: ${selectedNode.label}. Type: ${selectedNode.node_type}` : "No specific node selected"
        }),
      })

      const data = await response.json()

      setMessages((prev) => 
        prev.filter((m) => m.id !== loadingId).concat({
          id: String(Date.now()),
          text: data.reply || "Command executed.",
          isUser: false
        })
      )
    } catch (err) {
      setMessages((prev) => 
        prev.filter((m) => m.id !== loadingId).concat({
          id: String(Date.now()),
          text: "Could not connect to the server edge pipeline.",
          isUser: false
        })
      )
    }
  }

  const executeChatStream = async (customPrompt: string) => {
    setSendingChat(true)
    const placeholderId = String(Date.now())
    setMessages((prev) => [...prev, { id: placeholderId, text: "Streaming engine prompts...", isUser: false }])
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: customPrompt,
          formulaContext: selectedNode ? `Context Node Label: ${selectedNode.label}. Type: ${selectedNode.node_type}` : "No specific node selected"
        })
      })
      const data = await response.json()
      setMessages((prev) => 
        prev.filter((m) => m.id !== placeholderId).concat({
          id: String(Date.now()),
          text: data.reply || "Socratic nodes updated successfully.",
          isUser: false
        })
      )
    } catch (err) {
      console.error("Failed to execute graph-targeted chat stream:", err)
    } finally {
      setSendingChat(false)
    }
  }

  const handleAddDefenseScore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedNode || !newQuestion.trim() || !newAnswer.trim()) return

    setSavingScore(true)
    try {
      const currentLogs = selectedNode.viva_feedback || []
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      
      const updatedLogs: FeedbackItem[] = [
        ...currentLogs,
        { t: timestamp, q: true, text: newQuestion },
        { t: timestamp, q: false, text: newAnswer }
      ]

      await conceptNodesCrud.updateById(selectedNode.id, {
        viva_feedback: updatedLogs
      })

      await fetchGraphData()
      
      setNewQuestion("")
      setNewAnswer("")
      setShowScoreModal(false)
    } catch (err) {
      console.error("Error updating viva evaluation log entry matrix:", err)
    } finally {
      setSavingScore(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 p-4 lg:p-5 w-full check-layout">
        {/* Adjusted column grid settings to stretch elements down dynamically */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px] items-stretch">
          
          {/* LEFT CANVAS WORKSPACE AREA CONTAINER - Stretched minimum viewport boundaries */}
          <section className="relative min-h-[78vh] flex-1 overflow-hidden rounded-xl border border-border bg-card flex flex-col shadow-sm">
            <div className="flex items-center justify-between border-b border-border p-3 bg-card">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-card-foreground">Relational Methodology Web Canvas</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <Legend color="bg-primary" label="Paper Structure" />
                <Legend color="bg-accent" label="Core Prerequisite" />
                <Legend color="border-2 border-dashed border-accent bg-card" label="Identified Gap" />
              </div>
            </div>

            <div className="relative flex-1 w-full bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [background-size:22px_22px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" /> Compiling live relational database nodes...
                </div>
              ) : nodes.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-muted-foreground text-xs">
                  <p className="font-semibold">No methodology concept nodes processed.</p>
                  <p className="max-w-xs mt-1 text-muted-foreground/70">Upload structural text assets to Document Interaction Studio to trigger model vector nodes.</p>
                </div>
              ) : (
                <>
                  <svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true">
                    {STATIC_EDGES.map(([a, b], i) => {
                      const na = nodes[i % nodes.length]
                      const nb = nodes[(i + 1) % nodes.length]
                      if (!na || !nb) return null
                      return (
                        <line
                          key={i}
                          x1={na.x} 
                          y1={na.y} 
                          x2={nb.x} 
                          y2={nb.y}
                          stroke="var(--color-border)"
                          strokeWidth={1.5}
                          strokeDasharray={na.node_type === "research_gap" || nb.node_type === "research_gap" ? "4 4" : undefined}
                        />
                      )
                    })}
                  </svg>

                  {nodes.map((n) => {
                    const isSelected = selectedNode?.id === n.id
                    const Icon = n.node_type === "paper" ? FileText : n.node_type === "prerequisite" ? Layers : Lightbulb
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setSelectedNode(n)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none transition-transform active:scale-95"
                        style={{ left: `${n.x}px`, top: `${n.y}px`, zIndex: isSelected ? 30 : 10 }}
                      >
                        <div
                          className={`flex max-w-[180px] items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium shadow-md border transition-all ${
                            isSelected 
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105" 
                              : "hover:scale-105"
                          } ${
                            n.node_type === "paper"
                              ? "bg-primary text-primary-foreground border-primary"
                              : n.node_type === "prerequisite"
                                ? "bg-accent text-accent-foreground border-accent"
                                : "border-2 border-dashed border-accent bg-card text-foreground"
                          }`}
                        >
                          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="leading-tight text-left truncate max-w-[120px]">{n.label}</span>
                        </div>
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          </section>

          {/* RIGHT INTERACTIVE SOCRATIC SIDEBAR INTERACTIVE LOGGER FRAMEWORK - Locked to h-full flex configurations */}
          <section className="flex flex-col gap-4 h-full min-h-[78vh]">
            
            {/* Viva Pod Module Panel */}
            <div className="rounded-xl border border-border bg-primary p-4 text-primary-foreground shadow-sm shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="size-4 text-accent" aria-hidden="true" />
                  <p className="text-sm font-semibold">Socratic Audio · Viva Pod</p>
                </div>
                {selectedNode && (
                  <span className="text-[10px] bg-primary-foreground/10 px-2 py-0.5 rounded-md text-primary-foreground/80 max-w-[150px] truncate">
                    Target: {selectedNode.label}
                  </span>
                )}
              </div>
              
              <div className="mt-4 flex flex-col items-center gap-3">
                <button
                  type="button"
                  disabled={!selectedNode}
                  onClick={recording ? stopRecording : startRecording}
                  className={`relative flex size-20 items-center justify-center rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    recording ? "bg-accent text-accent-foreground shadow-lg" : "bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
                  }`}
                >
                  {recording && (
                    <span className="absolute inline-flex size-20 animate-ping rounded-full bg-accent opacity-30" />
                  )}
                  {recording ? <Mic className="size-8" /> : <MicOff className="size-8" />}
                </button>
                
                <div className="flex items-center gap-2 text-[11px] font-medium">
                  <CircleDot className={`size-3.5 ${recording ? "text-accent animate-pulse" : "text-primary-foreground/40"}`} />
                  {recording ? "Streaming Defense Audio · Live" : !selectedNode ? "Select a node to begin defense" : "Microphone Idle Context"}
                </div>
              </div>
            </div>

            {/* Live Viva Board Simulation Engine Pod - Extended display borders cleanly */}
            {selectedNode && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm shrink-0 transition-all animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                  <div className="min-w-0 flex-1 pr-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      Live Viva Board Simulation Engine
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Real-time thesis defense simulator</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sendingChat}
                    onClick={() => executeChatStream(`Act as an expert academic board examiner. Generate 3 rigorous, highly specific Viva defense questions targeting the methodology parameters, experimental bounds, and core assumptions for the current highlighted node: "${selectedNode.label}" (${selectedNode.node_type}).`)}
                    className="text-xs gap-1.5 h-8 font-medium hover:bg-emerald-50/50 hover:text-emerald-600 hover:border-emerald-200 transition-colors shrink-0"
                  >
                    <Sparkles className="size-3.5 text-emerald-500" />
                    Generate Defense Set
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border border-border/50">
                  <span className="font-semibold text-foreground">How it works:</span> Fire deep academic structural scrutiny regarding <span className="font-mono bg-background px-1 rounded border text-foreground">{selectedNode.label}</span> directly into the communication terminal framework below.
                </div>
              </div>
            )}

            {/* GROUNDED CHAT TERMINAL PANEL INTERACTIVE MATRIX STUDIO BLOCK - flex-1 expands to take remaining height */}
            <div className="flex flex-col rounded-xl border border-border bg-card flex-1 min-h-[300px] shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border p-3 bg-muted/30 shrink-0">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-card-foreground">Source-Grounded Interaction Chat Studio Terminal</p>
              </div>

              {/* Increased maximum scrolling layout threshold to capture full block updates */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[320px]">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        m.isUser
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "border border-border bg-background text-foreground rounded-tl-sm shadow-sm"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t border-border p-3 bg-background mt-auto shrink-0">
                <Highlighter className="size-4 text-muted-foreground" aria-hidden="true" />
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Query methodology schema vectors or write an analytics constraint rule parameter..."
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground text-foreground"
                />
                <Button type="submit" size="icon" className="size-8 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                  <Send className="size-3.5" />
                </Button>
              </form>
            </div>
          </section>
        </div>

        {/* INTERACTIVE DIALOG MODAL BOX */}
        {showScoreModal && selectedNode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">Score Defense Response</h4>
                  <p className="text-xs text-muted-foreground truncate">Node Matrix: {selectedNode.label}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowScoreModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleAddDefenseScore} className="space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block text-[11px] font-medium text-muted-foreground">
                      Socratic Query Statement
                    </label>
                    <Tooltip>
                      <TooltipTrigger type="button" className="text-muted-foreground hover:text-primary transition-colors">
                        <Info className="size-3" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[10px]">
                        Log the explicit concept question asked during the defense timeline stream.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <input
                    type="text"
                    required
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="e.g., How does this parameter affect network topology?"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary text-foreground"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block text-[11px] font-medium text-muted-foreground">
                      Candidate Oral Response Evaluation
                    </label>
                    <Tooltip>
                      <TooltipTrigger type="button" className="text-muted-foreground hover:text-primary transition-colors">
                        <Info className="size-3" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[10px]">
                        Input detailed graded remarks regarding structural phrasing accuracy and logical completeness.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="Input analyzed student response and graded remarks here..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary resize-none text-foreground"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowScoreModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={savingScore || !newQuestion.trim() || !newAnswer.trim()}
                    className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
                  >
                    {savingScore && <Loader2 className="size-3 animate-spin" />}
                    Commit Entry
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground font-medium select-none">
      <span className={`size-2.5 rounded-sm ${color} shrink-0`} />
      {label}
    </span>
  )
}