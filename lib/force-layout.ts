import type { ConceptNodeType, ConceptEdgeRow } from "@/lib/types"

/**
 * Input node shape accepted by the layout engine.
 * x/y are optional — when absent (or the DB default 0,0) the node is auto-laid-out.
 */
export interface ForceLayoutNode {
  id: string
  node_type: ConceptNodeType
  x?: number
  y?: number
}

export interface LayoutResult {
  x: number
  y: number
}

// ── Aesthetic layout constants ────────────────────────────────────────────────
const CELL_WIDTH = 250         // Horizontal grid pitch (text-box friendly)
const CELL_HEIGHT_TARGET = 170 // Desired vertical grid pitch
const CELL_HEIGHT_MIN = 120    // Floor for vertical pitch on dense graphs
const MAX_COLUMNS = 5          // Hard wrap width → prevents infinite right-stretch
const MIN_COLUMNS = 2
const PADDING_X = 90           // Side breathing room
const PADDING_Y = 90           // Top/bottom breathing room
const NODE_GAP = 26            // Gap enforced between node boxes after placement
const NODE_WIDTH = 180         // Approx node box width used for collision checks
const NODE_HEIGHT = 44         // Approx node box height used for collision checks

function hasSavedPosition(node: ForceLayoutNode): boolean {
  const { x, y } = node
  // (0,0) is the database default for never-positioned nodes.
  return (
    typeof x === "number" &&
    typeof y === "number" &&
    (Math.abs(x) > 0.5 || Math.abs(y) > 0.5)
  )
}

function nodeTypeToLayer(nodeType: ConceptNodeType): number {
  switch (nodeType) {
    case "prerequisite":
      return 0
    case "paper":
      return 1
    case "research_gap":
      return 2
    default:
      return 1
  }
}

/**
 * Deterministic, grid-aligned layered layout engine.
 *
 * Replaces the old chaotic d3-force scatter with a compact Sugiyama-style
 * tiered layout:
 *   1. Longest-path tiering — edges push nodes deeper down the canvas;
 *      disconnected nodes fall back to their semantic type row.
 *   2. Barycenter sweeps — re-order nodes inside each tier so connected nodes
 *      sit close together and edge crossings collapse.
 *   3. Grid-aligned centering with row wrapping — nodes snap to a clean grid
 *      and compact rows wrap before they ever stretch off-screen to the right.
 *   4. Pinned-node support — nodes that already have saved coordinates are
 *      preserved exactly; free nodes route around them via a collision pass,
 *      so the engine never snaps a manually placed node back.
 */
export function computeForceLayout(
  nodes: ForceLayoutNode[],
  edges: ConceptEdgeRow[],
  width: number,
  height: number,
  ignoreSaved = false,
): Map<string, LayoutResult> {
  const result = new Map<string, LayoutResult>()
  if (nodes.length === 0) return result

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  // Collect pinned nodes (already-positioned) unless explicitly ignored.
  const pinnedIds = new Set<string>()
  if (!ignoreSaved) {
    nodes.forEach((n) => {
      if (hasSavedPosition(n)) pinnedIds.add(n.id)
    })
  }

  // Single node: pin it, or center it in its semantic band.
  if (nodes.length === 1) {
    const n = nodes[0]
    result.set(
      n.id,
      pinnedIds.has(n.id)
        ? { x: n.x ?? width / 2, y: n.y ?? nodeTypeToLayer(n.node_type) }
        : { x: width / 2, y: 220 },
    )
    return result
  }

  // ── 1) Build adjacency (undirected for ordering) + layer assignment ─────────
  const validEdges = edges.filter(
    (e) => nodeMap.has(e.source_node_id) && nodeMap.has(e.target_node_id),
  )
  const adjacency = new Map<string, string[]>()
  nodes.forEach((n) => adjacency.set(n.id, []))
  validEdges.forEach((e) => {
    adjacency.get(e.source_node_id)?.push(e.target_node_id)
    adjacency.get(e.target_node_id)?.push(e.source_node_id)
  })

  // Longest-path relaxation on the directed edges → tier depth.
  const layer = new Map<string, number>()
  nodes.forEach((n) => layer.set(n.id, nodeTypeToLayer(n.node_type)))
  let changed = true
  let guard = 0
  while (changed && guard < nodes.length * 2) {
    changed = false
    guard++
    for (const e of validEdges) {
      const src = layer.get(e.source_node_id) ?? 0
      const next = src + 1
      const tgt = layer.get(e.target_node_id) ?? 0
      if (tgt < next) {
        layer.set(e.target_node_id, next)
        changed = true
      }
    }
  }

  const maxLayer = Math.max(0, ...nodes.map((n) => layer.get(n.id) ?? 0))
  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => [])
  nodes.forEach((n) => layers[layer.get(n.id) ?? 0].push(n.id))

  // ── 2) Initial ordering — pinned nodes anchor by X, rest deterministic ──────
  layers.forEach((tier) => {
    tier.sort((a, b) => {
      const na = nodeMap.get(a)!
      const nb = nodeMap.get(b)!
      const ax = pinnedIds.has(a) ? (na.x ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
      const bx = pinnedIds.has(b) ? (nb.x ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
      if (ax !== bx) return ax - bx
      return a.localeCompare(b)
    })
  })

  // ── 3) Barycenter sweeps — collapse edge crossings ──────────────────────────
  const orderIndex = new Map<string, number>()
  const refreshIndices = () => {
    orderIndex.clear()
    layers.forEach((tier) => tier.forEach((id, i) => orderIndex.set(id, i)))
  }
  const sweep = (bottomUp: boolean) => {
    const order = layers.map((_, i) => i)
    if (bottomUp) order.reverse()
    for (const tierIdx of order) {
      const bary = new Map<string, number>()
      for (const id of layers[tierIdx]) {
        const neighbors = adjacency.get(id) ?? []
        const valid = neighbors.filter((nid) => orderIndex.has(nid))
        if (valid.length === 0) {
          bary.set(id, orderIndex.get(id) ?? 0)
          continue
        }
        const avg =
          valid.reduce((sum, nid) => sum + (orderIndex.get(nid) ?? 0), 0) /
          valid.length
        bary.set(id, avg)
      }
      layers[tierIdx].sort((a, b) => (bary.get(a) ?? 0) - (bary.get(b) ?? 0))
      refreshIndices()
    }
  }
  refreshIndices()
  for (let i = 0; i < 3; i++) {
    sweep(false)
    sweep(true)
  }

  // ── 4) Compact grid placement — wrap rows, center horizontally ──────────────
  const usableWidth = Math.max(180, width - PADDING_X * 2)
  const columns = Math.max(
    MIN_COLUMNS,
    Math.min(MAX_COLUMNS, Math.floor(usableWidth / CELL_WIDTH)),
  )
  const cellW = Math.min(CELL_WIDTH, usableWidth / columns)

  const rows: string[][] = []
  layers.forEach((tier) => {
    for (let i = 0; i < tier.length; i += columns) {
      rows.push(tier.slice(i, i + columns))
    }
  })

  const availableHeight = Math.max(240, height - PADDING_Y * 2)
  const rowStride = Math.max(
    CELL_HEIGHT_MIN,
    Math.min(CELL_HEIGHT_TARGET, availableHeight / rows.length),
  )
  const startY = PADDING_Y + (availableHeight - rows.length * rowStride) / 2

  const placed = new Map<string, LayoutResult>()
  rows.forEach((row, rowIdx) => {
    const rowWidth = row.length * cellW
    const startX = width / 2 - rowWidth / 2
    row.forEach((id, colIdx) => {
      placed.set(id, {
        x: startX + colIdx * cellW,
        y: startY + rowIdx * rowStride,
      })
    })
  })

  // ── 5) Merge pinned positions exactly, then route free nodes around them ────
  nodes.forEach((n) => {
    if (pinnedIds.has(n.id) && n.x !== undefined && n.y !== undefined) {
      result.set(n.id, { x: n.x, y: n.y })
    }
  })

  const rects = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >()
  pinnedIds.forEach((id) => {
    const point = result.get(id)
    if (point) rects.set(id, { x: point.x, y: point.y, w: NODE_WIDTH, h: NODE_HEIGHT })
  })

  const overlaps = (ax: number, ay: number, bx: number, by: number) =>
    Math.abs(ax - bx) < NODE_WIDTH + NODE_GAP &&
    Math.abs(ay - by) < NODE_HEIGHT + NODE_GAP

  const freeIds = nodes.map((n) => n.id).filter((id) => !pinnedIds.has(id))

  for (const id of freeIds) {
    let { x, y } = placed.get(id) ?? { x: width / 2, y: height / 2 }
    let bumped = 0
    while (bumped < 4) {
      let hit = false
      for (const [otherId, r] of rects) {
        if (otherId === id) continue
        if (overlaps(x, y, r.x, r.y)) {
          hit = true
          break
        }
      }
      if (!hit) break
      y += rowStride
      bumped++
    }
    x = Math.max(PADDING_X, Math.min(width - PADDING_X, x))
    y = Math.max(PADDING_Y, Math.min(height - PADDING_Y, y))
    rects.set(id, { x, y, w: NODE_WIDTH, h: NODE_HEIGHT })
    result.set(id, { x, y })
  }

  return result
}