import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceY,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force"
import type { ConceptNodeType, ConceptEdgeRow } from "@/lib/types"

/**
 * Extends SimulationNodeDatum with application-specific properties.
 * x/y remain optional per the d3-force type definition.
 */
interface ForceNode extends SimulationNodeDatum {
  id: string
  node_type: ConceptNodeType
}

/**
 * Runs a synchronous d3-force simulation to compute optimal node positions.
 * Preserves vertical layering by node type (prerequisite→top, paper→middle, gap→bottom)
 * while letting connected nodes cluster and unconnected nodes spread apart.
 */
export function computeForceLayout(
  nodes: Array<{ id: string; node_type: ConceptNodeType; x?: number; y?: number }>,
  edges: ConceptEdgeRow[],
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map()
  if (nodes.length === 1) {
    return new Map([[nodes[0].id, { x: width / 2, y: nodeTypeToY(nodes[0].node_type) }]])
  }

  // Build simulation nodes with random-ish initial positions within their row band
  const nodeMap = new Map<string, ForceNode>()
  const simNodes: ForceNode[] = nodes.map((n, i) => {
    const rowBaseY = nodeTypeToY(n.node_type)
    // Distribute evenly across width initially for faster convergence
    const spreadX = 120 + i * ((width - 240) / Math.max(1, nodes.length - 1))
    const forceNode: ForceNode = {
      id: n.id,
      node_type: n.node_type,
      x: n.x ?? spreadX + (Math.random() - 0.5) * 40,
      y: n.y ?? rowBaseY + (Math.random() - 0.5) * 40,
    }
    nodeMap.set(n.id, forceNode)
    return forceNode
  })

  // Build link edges using string IDs (d3-force resolves to node references internally)
  const simLinks: SimulationLinkDatum<ForceNode>[] = edges
    .filter((e) => nodeMap.has(e.source_node_id) && nodeMap.has(e.target_node_id))
    .map((e) => ({
      source: e.source_node_id,
      target: e.target_node_id,
    }))

  const simulation = forceSimulation(simNodes)
    .force(
      "charge",
      forceManyBody<ForceNode>()
        .strength(-400), // repulsion between all nodes
    )
    .force(
      "center",
      forceCenter(width / 2, height / 2),
    )
    .force(
      "link",
      forceLink<ForceNode, SimulationLinkDatum<ForceNode>>(simLinks)
        .id((d: ForceNode) => d.id)
        .distance(160)   // target distance for connected nodes
        .strength(0.4),  // how strongly edges pull nodes together
    )
    .force(
      "y",
      forceY<ForceNode>((d: ForceNode) => nodeTypeToY(d.node_type))
        .strength(0.25), // mild vertical guidance to preserve row layering
    )
    .force(
      "collide",
      forceCollide<ForceNode>(55), // minimum distance between nodes (prevents overlap)
    )
    .stop()

  // Run 300 ticks synchronously — enough for convergence
  simulation.tick(300)

  // Extract final positions, clamped within canvas bounds with padding
  const positions = new Map<string, { x: number; y: number }>()
  simNodes.forEach((n) => {
    positions.set(n.id, {
      x: Math.max(70, Math.min(width - 70, n.x ?? width / 2)),
      y: Math.max(50, Math.min(height - 50, n.y ?? height / 2)),
    })
  })

  return positions
}

function nodeTypeToY(nodeType: ConceptNodeType): number {
  switch (nodeType) {
    case "prerequisite":
      return 120
    case "paper":
      return 320
    case "research_gap":
      return 520
    default:
      return 320
  }
}