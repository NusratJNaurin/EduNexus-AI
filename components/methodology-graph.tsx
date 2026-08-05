"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Mic,
  MicOff,
  FileText,
  Lightbulb,
  Layers,
  Sparkles,
  Highlighter,
  LayoutGrid,
  Send,
  Loader2,
  X,
  Info,
  Network,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { supabase } from "@/lib/supabase"
import { conceptNodesCrud, conceptEdgesCrud } from "@/lib/crud"
import { postChat, postViva } from "@/lib/api-client"
import type { ConceptNodeRow, ConceptNodeType, VivaFeedbackItem, ConceptEdgeRow } from "@/lib/types"
import { parseVivaFeedback, serializeVivaFeedback } from "@/lib/types"
import { computeForceLayout } from "@/lib/force-layout"

interface GraphNode {
  id: string
  owner_id: string
  x: number
  y: number
  label: string
  node_type: ConceptNodeType
  viva_feedback: VivaFeedbackItem[]
  keywords: string[]
}

type ForceNodeInput = { id: string; node_type: ConceptNodeType; x?: number; y?: number }

// ── Illustrated empty state: researcher building a concept map ────────────────
function GraphEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 select-none pointer-events-none">
      {/* Animated skeleton graph nodes */}
      <div className="relative" style={{ width: 260, height: 160 }}>
        <svg width="260" height="160" viewBox="0 0 260 160" xmlns="http://www.w3.org/2000/svg">
          {/* Connecting dotted lines */}
          <line x1="70" y1="50" x2="130" y2="80" stroke="#7b1d3a" strokeWidth="1.5"
            strokeDasharray="5 4" strokeOpacity=".3" style={{ animation: "lineDash 1.8s linear infinite" }}/>
          <line x1="130" y1="80" x2="190" y2="50" stroke="#7b1d3a" strokeWidth="1.5"
            strokeDasharray="5 4" strokeOpacity=".3" style={{ animation: "lineDash 1.8s linear infinite .3s" }}/>
          <line x1="130" y1="80" x2="130" y2="130" stroke="#7b1d3a" strokeWidth="1.5"
            strokeDasharray="5 4" strokeOpacity=".3" style={{ animation: "lineDash 1.8s linear infinite .6s" }}/>
          <line x1="70" y1="50" x2="40" y2="110" stroke="#7b1d3a" strokeWidth="1.5"
            strokeDasharray="5 4" strokeOpacity=".2" style={{ animation: "lineDash 1.8s linear infinite .9s" }}/>
          <line x1="190" y1="50" x2="220" y2="110" stroke="#7b1d3a" strokeWidth="1.5"
            strokeDasharray="5 4" strokeOpacity=".2" style={{ animation: "lineDash 1.8s linear infinite 1.2s" }}/>

          {/* Central node */}
          <circle cx="130" cy="80" r="22" fill="#7b1d3a" fillOpacity=".12"
            stroke="#7b1d3a" strokeWidth="1.5" strokeOpacity=".4"
            style={{ animation: "nodePulse 2.4s ease-in-out infinite" }}/>
          <circle cx="130" cy="80" r="13" fill="#7b1d3a" fillOpacity=".18"
            style={{ animation: "nodePulse 2.4s ease-in-out infinite .2s" }}/>

          {/* Left node */}
          <circle cx="70" cy="50" r="16" fill="#3b82f6" fillOpacity=".1"
            stroke="#3b82f6" strokeWidth="1.5" strokeOpacity=".35"
            style={{ animation: "nodePulse 2.8s ease-in-out infinite .4s" }}/>
          <circle cx="70" cy="50" r="9" fill="#3b82f6" fillOpacity=".15"
            style={{ animation: "nodePulse 2.8s ease-in-out infinite .6s" }}/>

          {/* Right node */}
          <circle cx="190" cy="50" r="16" fill="#10b981" fillOpacity=".1"
            stroke="#10b981" strokeWidth="1.5" strokeOpacity=".35"
            style={{ animation: "nodePulse 3s ease-in-out infinite .8s" }}/>
          <circle cx="190" cy="50" r="9" fill="#10b981" fillOpacity=".15"
            style={{ animation: "nodePulse 3s ease-in-out infinite 1s" }}/>

          {/* Bottom node */}
          <circle cx="130" cy="130" r="14" fill="#8b5cf6" fillOpacity=".1"
            stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity=".35"
            style={{ animation: "nodePulse 2.6s ease-in-out infinite 1.2s" }}/>
          <circle cx="130" cy="130" r="8" fill="#8b5cf6" fillOpacity=".15"
            style={{ animation: "nodePulse 2.6s ease-in-out infinite 1.4s" }}/>

          {/* Far bottom-left */}
          <circle cx="40" cy="110" r="11" fill="#e05a3a" fillOpacity=".1"
            stroke="#e05a3a" strokeWidth="1.2" strokeOpacity=".3"
            style={{ animation: "nodePulse 3.2s ease-in-out infinite 1.6s" }}/>

          {/* Far bottom-right */}
          <circle cx="220" cy="110" r="11" fill="#e05a3a" fillOpacity=".1"
            stroke="#e05a3a" strokeWidth="1.2" strokeOpacity=".3"
            style={{ animation: "nodePulse 3.2s ease-in-out infinite 1.8s" }}/>

          {/* Labels */}
          <text x="130" y="83" textAnchor="middle" fontSize="7" fill="#7b1d3a" fillOpacity=".6" fontWeight="600">
            METHODOLOGY
          </text>
          <text x="70" y="53" textAnchor="middle" fontSize="6" fill="#3b82f6" fillOpacity=".7">STRUCTURE</text>
          <text x="190" y="53" textAnchor="middle" fontSize="6" fill="#10b981" fillOpacity=".7">PREREQS</text>
          <text x="130" y="133" textAnchor="middle" fontSize="6" fill="#8b5cf6" fillOpacity=".7">GAPS</text>
        </svg>
      </div>

      {/* Researcher figure below */}
      <div style={{ animation: "floatScholar 5s ease-in-out infinite" }}>
        <svg width="80" height="70" viewBox="0 0 80 70" xmlns="http://www.w3.org/2000/svg">
          {/* Body */}
          <rect x="28" y="30" width="24" height="28" rx="10" fill="#7b1d3a" fillOpacity=".2"/>
          {/* Head */}
          <circle cx="40" cy="20" r="12" fill="#f5e6c8"/>
          {/* Cap */}
          <rect x="28" y="12" width="24" height="4" rx="1" fill="#7b1d3a"/>
          <rect x="34" y="8" width="12" height="6" rx="1" fill="#7b1d3a"/>
          <line x1="52" y1="12" x2="56" y2="20" stroke="#7b1d3a" strokeWidth="1.2"/>
          <circle cx="56" cy="21" r="2" fill="#e05a3a"/>
          {/* Face */}
          <circle cx="36" cy="21" r="1.2" fill="#5a3020"/>
          <circle cx="44" cy="21" r="1.2" fill="#5a3020"/>
          <path d="M36 26 Q40 29 44 26" fill="none" stroke="#5a3020" strokeWidth="1" strokeLinecap="round"/>
          {/* Extended arm pointing */}
          <line x1="52" y1="38" x2="66" y2="28" stroke="#7b1d3a" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="67" cy="27" r="2.5" fill="#e05a3a" fillOpacity=".7"/>
        </svg>
      </div>

      <div className="text-center space-y-1.5">
        <p className="font-semibold text-sm" style={{ color: "#1a1a2e" }}>No methodology concept nodes processed.</p>
        <p className="text-xs leading-relaxed max-w-[240px]" style={{ color: "#717182" }}>
          Upload structural text assets to Document Interaction Studio to trigger model vector nodes.
        </p>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
        style={{ background: "rgba(123,29,58,.07)", color: "#7b1d3a" }}>
        <Network size={11}/><span>Graph engine standing by</span>
      </div>
    </div>
  );
}

// ── Audio Pod ─────────────────────────────────────────────────────────────────
function AudioPod({ micOn, onToggle }: { micOn: boolean; onToggle: () => void }) {
  const barCount = 18;
  return (
    <div className="flex-shrink-0 flex flex-col overflow-hidden rounded-none"
      style={{ background: "linear-gradient(175deg,#7b1d3a 0%,#5a0f28 70%,#3d0818 100%)", minHeight: 140, position: "relative" }}>
      {/* subtle mashrabiya overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: .1 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="audioMash" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="5" fill="none" stroke="white" strokeWidth=".6"/>
            <line x1="12" y1="2" x2="12" y2="22" stroke="white" strokeWidth=".4"/>
            <line x1="2" y1="12" x2="22" y2="12" stroke="white" strokeWidth=".4"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#audioMash)"/>
      </svg>

      <div className="relative z-10 flex items-center gap-1.5 px-3 pt-3 pb-2">
        <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,.15)" }}>
          <Mic size={9} color="white"/>
        </div>
        <p className="font-semibold tracking-wider text-white" style={{ fontSize: 9, letterSpacing: ".08em" }}>SOCRATIC AUDIO · VIVA POD</p>
      </div>

      {/* Waveform */}
      <div className="relative z-10 flex items-end justify-center gap-0.5 px-4 py-2" style={{ height: 52 }}>
        {Array.from({ length: barCount }).map((_, i) => {
          const delay = (i * 0.07).toFixed(2);
          const height = micOn ? 8 + Math.sin(i * 0.8) * 14 : 4 + Math.sin(i * 0.5) * 6;
          return (
            <div key={i} className="rounded-full flex-shrink-0"
              style={{
                width: 3, height: `${height}px`,
                background: `rgba(255,255,255,${micOn ? 0.75 : 0.35})`,
                animation: `waveBar ${micOn ? 0.6 + i * 0.04 : 1.2 + i * 0.06}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
                transformOrigin: "bottom",
                transition: "background .3s",
              }}/>
          );
        })}
      </div>

      {/* Mic button */}
      <div className="relative z-10 flex items-center justify-center pb-3 gap-3">
        <button onClick={onToggle}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: micOn ? "rgba(224,90,58,.9)" : "rgba(255,255,255,.15)",
            color: "white",
            border: "1px solid rgba(255,255,255,.2)",
            transition: "background .2s,box-shadow .2s",
            boxShadow: micOn ? "0 0 14px rgba(224,90,58,.5)" : "none",
          }}>
          {micOn ? <MicOff size={11}/> : <Mic size={11}/>}
          {micOn ? "End defense" : "Select a node to begin defense"}
        </button>
      </div>
    </div>
  );
}

// ── Light grid canvas background ──────────────────────────────────────────────
function GraphGridBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: .35 }}>
      <defs>
        <style>{`
          @keyframes lineDash {
            to { stroke-dashoffset: -18; }
          }
          @keyframes nodePulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.08); }
          }
          @keyframes floatScholar {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          @keyframes waveBar {
            0%, 100% { transform: scaleY(0.4); }
            50% { transform: scaleY(1); }
          }
        `}</style>
        <pattern id="graphGrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0 L0 0 0 28" fill="none" stroke="rgba(123,29,58,0.18)" strokeWidth=".5"/>
        </pattern>
        <pattern id="graphGridBig" x="0" y="0" width="112" height="112" patternUnits="userSpaceOnUse">
          <rect width="112" height="112" fill="url(#graphGrid)"/>
          <path d="M112 0 L0 0 0 112" fill="none" stroke="rgba(123,29,58,0.28)" strokeWidth=".8"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#graphGridBig)"/>
    </svg>
  );
}

export function MethodologyGraph() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const [messages, setMessages] = useState<Array<{ id: string; text: string; isUser: boolean }>>([
    {
      id: "init",
      text: "Welcome to the Methodology Graph Workspace terminal. Select a concept node or interact below.",
      isUser: false,
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [sendingChat, setSendingChat] = useState(false)

  const [showScoreModal, setShowScoreModal] = useState(false)
  const [newQuestion, setNewQuestion] = useState("")
  const [newAnswer, setNewAnswer] = useState("")
  const [savingScore, setSavingScore] = useState(false)

  const [conceptEdges, setConceptEdges] = useState<ConceptEdgeRow[]>([])

  // ── Manual drag + layout lock state ─────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [autoLayouting, setAutoLayouting] = useState(false)
  const dragRef = useRef<{ id: string; pointerId: number; offsetX: number; offsetY: number } | null>(null)
  // Client-side lock map: remembers positions (dragged or auto-laid-out) so
  // refetches always feed them back into the layout engine as pinned nodes.
  const lockMapRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  // Track actual canvas dimensions via ResizeObserver
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setCanvasSize({ width: Math.round(width), height: Math.round(height) })
        }
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Fetch graph data whenever canvas size stabilizes
  useEffect(() => {
    void fetchGraphData()
  }, [canvasSize])

  const fetchGraphData = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const allRecords = await conceptNodesCrud.fetchAll()
      const userRecords = allRecords.filter((item) => item.owner_id === user.id)
      const edgeRecords = await conceptEdgesCrud.fetchAll()
      const userEdges = edgeRecords.filter((e) => e.owner_id === user.id)

      console.log("[Debug] conceptEdges count:", userEdges.length)
      console.log("[Debug] conceptEdges:", userEdges.map((e) => ({ id: e.id, source: e.source_node_id, target: e.target_node_id, type: e.relationship_type })))

      // Use ResizeObserver-tracked dimensions
      const { width: containerWidth, height: containerHeight } = canvasSize
      console.log("[Debug] canvas dimensions:", containerWidth, containerHeight)

      // Build force layout input nodes from DB records, merging any
      // client-side locked positions (dragged this session) on top.
      const forceInput: ForceNodeInput[] = userRecords.map((item) => {
        const locked = lockMapRef.current.get(item.id)
        return {
          id: item.id,
          node_type: item.node_type,
          x: locked?.x ?? (item.position_x || undefined),
          y: locked?.y ?? (item.position_y || undefined),
        }
      })

      console.log("[Debug] forceInput nodes:", forceInput.map((n) => ({ id: n.id, type: n.node_type, x: n.x, y: n.y })))

      // Compute positions using the deterministic layered layout engine
      const positions = computeForceLayout(forceInput, userEdges, containerWidth, containerHeight)

      console.log("[Debug] computed positions:", Array.from(positions.entries()).map(([id, pos]) => ({ id, x: pos.x, y: pos.y })))

      // Map to GraphNode objects with computed positions
      const userNodes: GraphNode[] = userRecords.map((item) => ({
        id: item.id,
        owner_id: item.owner_id,
        x: positions.get(item.id)?.x ?? containerWidth / 2,
        y: positions.get(item.id)?.y ?? containerHeight / 2,
        label: item.label || "Unnamed Concept Parameter",
        node_type: item.node_type,
        viva_feedback: parseVivaFeedback(item.viva_feedback),
        keywords: (item as any).keywords || [],
      }))

      console.log("[Debug] userNodes final positions:", userNodes.map((n) => ({ id: n.id, x: n.x, y: n.y })))

      setNodes(userNodes)
      setConceptEdges(userEdges)
      if (userNodes.length > 0) {
        setSelectedNode((prev) => {
          const fresh = userNodes.find((node) => node.id === prev?.id)
          return fresh ?? userNodes[0]
        })
      }
    } catch (err) {
      console.error("Failed to compile methodology nodes:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── Node drag gestures ──────────────────────────────────────────────────────
  const handleNodePointerDown = (e: React.PointerEvent<HTMLButtonElement>, node: GraphNode) => {
    if (e.button !== 0) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    dragRef.current = {
      id: node.id,
      pointerId: e.pointerId,
      offsetX: node.x - (e.clientX - rect.left),
      offsetY: node.y - (e.clientY - rect.top),
    }
    setDraggingId(node.id)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pointer may already be inactive */
    }
  }

  const handleNodePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || e.pointerId !== drag.pointerId) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    const rawX = e.clientX - rect.left + drag.offsetX
    const rawY = e.clientY - rect.top + drag.offsetY
    const x = Math.max(65, Math.min(rect.width - 65, rawX))
    const y = Math.max(55, Math.min(rect.height - 55, rawY))

    lockMapRef.current.set(drag.id, { x, y })
    setNodes((prev) =>
      prev.map((n) => (n.id === drag.id ? { ...n, x, y } : n)),
    )
  }

  const endNodeDrag = (e: React.PointerEvent<HTMLButtonElement>, persist: boolean) => {
    const drag = dragRef.current
    if (!drag || e.pointerId !== drag.pointerId) return
    dragRef.current = null
    setDraggingId(null)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* capture may already be released */
    }
    if (!persist) return
    const locked = lockMapRef.current.get(drag.id)
    if (!locked) return
    // Persist the locked position so the layout engine treats it as pinned
    // on every future fetch and never snaps it back.
    void conceptNodesCrud
      .updateById(drag.id, { position_x: locked.x, position_y: locked.y })
      .catch((err) => console.error("Failed to save node position:", err))
  }

  // ── Auto-Layout button: fresh, deterministic, beautiful arrangement ─────────
  const handleAutoLayout = async () => {
    if (nodes.length === 0 || autoLayouting) return
    setAutoLayouting(true)
    try {
      const { width: canvasWidth, height: canvasHeight } = canvasSize
      const positions = computeForceLayout(
        nodes.map((n) => ({ id: n.id, node_type: n.node_type })),
        conceptEdges,
        canvasWidth,
        canvasHeight,
        true, // ignoreSaved → re-layout every node, including previously pinned ones
      )
      if (positions.size === 0) return

      setNodes((prev) =>
        prev.map((n) => {
          const pos = positions.get(n.id)
          return pos ? { ...n, x: pos.x, y: pos.y } : n
        }),
      )
      positions.forEach((pos, id) => lockMapRef.current.set(id, pos))

      await Promise.all(
        Array.from(positions.entries()).map(([id, pos]) =>
          conceptNodesCrud
            .updateById(id, { position_x: pos.x, position_y: pos.y })
            .catch((err) => console.error("Failed to persist auto-layout position:", err)),
        ),
      )
    } catch (err) {
      console.error("Auto-layout engine failed:", err)
    } finally {
      setAutoLayouting(false)
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
        stream.getTracks().forEach((track) => track.stop())
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

    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.id !== selectedNode.id) return node
        return {
          ...node,
          viva_feedback: [
            ...node.viva_feedback,
            { t: loadingTimestamp, q: true, text: "Processing your audio response..." },
          ],
        }
      }),
    )

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "defense-audio.webm")
      formData.append("nodeLabel", selectedNode.label)
      formData.append("nodeType", selectedNode.node_type)

      const data = await postViva(formData)
      const currentLogs = selectedNode.viva_feedback
      const finalTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

      const updatedLogs: VivaFeedbackItem[] = [
        ...currentLogs.filter((log) => log.text !== "Processing your audio response..."),
        { t: finalTimestamp, q: true, text: data.transcription || "Audio recorded successfully." },
        { t: finalTimestamp, q: false, text: data.evaluation || "Evaluation could not compile." },
      ]

      await conceptNodesCrud.updateById(selectedNode.id, {
        viva_feedback: serializeVivaFeedback(updatedLogs),
      })

      await fetchGraphData()
    } catch (err) {
      console.error("Viva validation processing route crash:", err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || sendingChat) return

    const userMsg = { id: String(Date.now()), text: chatInput, isUser: true }
    setMessages((prev) => [...prev, userMsg])
    const promptSnapshot = chatInput
    setChatInput("")

    const loadingId = "loading-placeholder"
    setMessages((prev) => [...prev, { id: loadingId, text: "Consulting AI model engine...", isUser: false }])
    setSendingChat(true)

    try {
      const data = await postChat({
        prompt: promptSnapshot,
        formulaContext: selectedNode
          ? `Context Node Label: ${selectedNode.label}. Type: ${selectedNode.node_type}`
          : "No specific node selected",
      })

      setMessages((prev) =>
        prev
          .filter((message) => message.id !== loadingId)
          .concat({
            id: String(Date.now()),
            text: data.reply || "Command executed.",
            isUser: false,
          }),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not connect to the server edge pipeline."
      setMessages((prev) =>
        prev
          .filter((item) => item.id !== loadingId)
          .concat({
            id: String(Date.now()),
            text: message,
            isUser: false,
          }),
      )
    } finally {
      setSendingChat(false)
    }
  }

  const executeChatStream = async (customPrompt: string) => {
    if (sendingChat) return

    setSendingChat(true)
    const placeholderId = String(Date.now())
    setMessages((prev) => [...prev, { id: placeholderId, text: "Streaming engine prompts...", isUser: false }])

    try {
      const data = await postChat({
        prompt: customPrompt,
        formulaContext: selectedNode
          ? `Context Node Label: ${selectedNode.label}. Type: ${selectedNode.node_type}`
          : "No specific node selected",
      })

      setMessages((prev) =>
        prev
          .filter((message) => message.id !== placeholderId)
          .concat({
            id: String(Date.now()),
            text: data.reply || "Socratic nodes updated successfully.",
            isUser: false,
          }),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to execute graph-targeted chat stream."
      setMessages((prev) =>
        prev
          .filter((item) => item.id !== placeholderId)
          .concat({
            id: String(Date.now()),
            text: message,
            isUser: false,
          }),
      )
    } finally {
      setSendingChat(false)
    }
  }

  const handleAddDefenseScore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedNode || !newQuestion.trim() || !newAnswer.trim()) return

    setSavingScore(true)
    try {
      const currentLogs = selectedNode.viva_feedback
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

      const updatedLogs: VivaFeedbackItem[] = [
        ...currentLogs,
        { t: timestamp, q: true, text: newQuestion },
        { t: timestamp, q: false, text: newAnswer },
      ]

      await conceptNodesCrud.updateById(selectedNode.id, {
        viva_feedback: serializeVivaFeedback(updatedLogs),
      })

      await fetchGraphData()
      setNewQuestion("")
      setNewAnswer("")
      setShowScoreModal(false)
    } catch (err) {
      console.error("Error updating viva evaluation log entry:", err)
    } finally {
      setSavingScore(false)
    }
  }

  return (
    <TooltipProvider>
        <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-12 lg:p-5 overflow-y-auto min-h-full">
          <section className="relative lg:col-span-8 flex flex-1 flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-3 bg-card">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-card-foreground">Relational Methodology Web Canvas</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <Legend color="bg-slate-700" label="Paper Structure" />
                <Legend color="bg-blue-500" label="Core Prerequisite" />
                <Legend color="border-2 border-dashed border-red-500 bg-card" label="Identified Gap" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading || autoLayouting || nodes.length === 0}
                  onClick={() => void handleAutoLayout()}
                  className="h-7 gap-1.5 px-2.5 text-[11px] font-medium"
                >
                  {autoLayouting ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <LayoutGrid className="size-3" />
                  )}
                  {autoLayouting ? "Laying out..." : "Auto Layout"}
                </Button>
              </div>
            </div>

            <div ref={canvasRef} className="relative flex-1 w-full overflow-hidden">
              <GraphGridBackground />
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" /> Compiling live relational database nodes...
                </div>
              ) : nodes.length === 0 ? (
                <div className="absolute inset-0">
                  <GraphEmptyState />
                </div>
              ) : (
                <>
                  <svg className="absolute inset-0 h-full w-full pointer-events-none z-0" aria-hidden="true">
                    <defs>
                      <marker id="arrow-prerequisite" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                      </marker>
                      <marker id="arrow-gap" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                      </marker>
                    </defs>

                    {conceptEdges.map((edge) => {
                      const sourceNode = nodes.find((n) => n.id === edge.source_node_id)
                      const targetNode = nodes.find((n) => n.id === edge.target_node_id)

                      if (!sourceNode || !targetNode) return null

                      const isPrereq = edge.relationship_type === "prerequisite"

                      return (
                        <g key={edge.id}>
                          <line
                            x1={sourceNode.x}
                            y1={sourceNode.y}
                            x2={targetNode.x}
                            y2={targetNode.y}
                            stroke={isPrereq ? "#3b82f6" : "#ef4444"}
                            strokeWidth={isPrereq ? 2.5 : 2}
                            strokeDasharray={isPrereq ? undefined : "5 5"}
                            markerEnd={isPrereq ? "url(#arrow-prerequisite)" : "url(#arrow-gap)"}
                            className="opacity-75"
                          />
                          <circle 
                            cx={(sourceNode.x + targetNode.x) / 2} 
                            cy={(sourceNode.y + targetNode.y) / 2} 
                            r="5" 
                            className="fill-white stroke-slate-400"
                          />
                        </g>
                      )
                    })}
                  </svg>

                  <div className="absolute inset-0 z-10 pointer-events-none">
                    {nodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id
                      const Icon = node.node_type === "paper" ? FileText : node.node_type === "prerequisite" ? Layers : Lightbulb
                      
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => setSelectedNode(node)}
                          onPointerDown={(e) => handleNodePointerDown(e, node)}
                          onPointerMove={handleNodePointerMove}
                          onPointerUp={(e) => endNodeDrag(e, true)}
                          onPointerCancel={(e) => endNodeDrag(e, false)}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none transition-transform pointer-events-auto touch-none select-none ${
                            draggingId === node.id
                              ? "cursor-grabbing scale-105"
                              : "cursor-grab hover:scale-105 active:scale-95"
                          }`}
                          style={{ left: `${node.x}px`, top: `${node.y}px` }}
                        >
                          <div
                            className={`flex max-w-[180px] items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium shadow-md border transition-all ${
                              isSelected || draggingId === node.id
                                ? "ring-4 ring-indigo-500 scale-105"
                                : "hover:scale-105"
                            } ${
                              node.node_type === "prerequisite"
                                ? "bg-blue-500 text-white border-blue-500"
                                : node.node_type === "research_gap"
                                  ? "bg-red-500 text-white border-red-500"
                                  : "bg-slate-700 text-white border-slate-700"
                            }`}
                          >
                            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="leading-tight text-left truncate max-w-[120px]">{node.label}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-4 lg:col-span-4 overflow-y-auto">
            <AudioPod
              micOn={recording}
              onToggle={() => {
                if (!selectedNode) return
                if (recording) {
                  stopRecording()
                } else {
                  startRecording()
                }
              }}
            />

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
                    onClick={() =>
                      void executeChatStream(
                        `Act as an expert academic board examiner. Generate 3 rigorous, highly specific Viva defense questions targeting the methodology parameters, experimental bounds, and core assumptions for the current highlighted node: "${selectedNode.label}" (${selectedNode.node_type}).`,
                      )
                    }
                    className="text-xs gap-1.5 h-8 font-medium hover:bg-emerald-50/50 hover:text-emerald-600 hover:border-emerald-200 transition-colors shrink-0"
                  >
                    <Sparkles className="size-3.5 text-emerald-500" />
                    Generate Defense Set
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border border-border/50">
                  <span className="font-semibold text-foreground">How it works:</span> Fire deep academic structural scrutiny
                  regarding{" "}
                  <span className="font-mono bg-background px-1 rounded border text-foreground">{selectedNode.label}</span>{" "}
                  directly into the communication terminal framework below.
                </div>
              </div>
            )}

            <div className="flex flex-col rounded-xl border border-border bg-card flex-1 min-h-[300px] shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border p-3 bg-muted/30 shrink-0">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-card-foreground">Source-Grounded Interaction Chat Studio Terminal</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[320px]">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        message.isUser
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "border border-border bg-background text-foreground rounded-tl-sm shadow-sm"
                      }`}
                    >
                      {message.text}
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
                    <label className="block text-[11px] font-medium text-muted-foreground">Socratic Query Statement</label>
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
                    <label className="block text-[11px] font-medium text-muted-foreground">Candidate Oral Response Evaluation</label>
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
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowScoreModal(false)} className="text-xs">
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