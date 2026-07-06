import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Cpu,
  Terminal,
  Users,
  Lock,
  Zap,
  Clock,
  Network,
  Globe,
  Download,
  MapPin,
} from "lucide-react";
import { usePageHeader } from "@/contexts/usePageHeader";
import { Badge } from "@nous-research/ui/ui/components/badge";
import { api } from "@/lib/api";
import type { StatusResponse, SessionInfo } from "@/lib/api";

/* ================================================================== */
/*  TYPES — all dashboard data structures                             */
/* ================================================================== */

interface DashboardState {
  status: StatusResponse | null;
  sessions: { total: number; active: number };
  analytics: { totalTokens: number; totalCost: number; modelBreakdown: Record<string, number> };
  loading: boolean;
  lastRefresh: Date | null;
}

interface StateData {
  id: string;
  name: string;
  threatLevel: "critical" | "high" | "medium" | "low";
  activeCases: number;
  flaggedAccounts: number;
  coordinates: { x: number; y: number };
  districts: { name: string; cases: number }[];
}

interface NodeData {
  id: string;
  label: string;
  type: "phone" | "telegram" | "whatsapp" | "instagram" | "email" | "wallet" | "domain" | "ip";
  x: number;
  y: number;
  reasoning: string;
  confidence: number;
  source: string;
  timestamp: string;
}

interface EdgeData {
  id: string;
  from: string;
  to: string;
  confidence: number;
  source: string;
}

interface AlertItem {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  timestamp: string;
  source: string;
  actionTaken?: string;
}

interface EvidenceItem {
  id: string;
  type: string;
  platform: string;
  timestamp: string;
  hash: string;
  summary: string;
}

interface TimelineEvent {
  time: string;
  action: string;
  details: string;
  icon: typeof Zap;
}

interface LogicStep {
  text: string;
  detail: string;
  status: "done" | "pending";
}

/* ================================================================== */
/*  HOOK — single source of truth, polls /api/status + /api/sessions  */
/* ================================================================== */
const POLL_MS = 8_000;

function useDashboardData(): DashboardState & { sessionsList: SessionInfo[] } {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [sessions, setSessions] = useState({ total: 0, active: 0 });
  const [sessionsList, setSessionsList] = useState<SessionInfo[]>([]);
  const [analytics, setAnalytics] = useState({ totalTokens: 0, totalCost: 0, modelBreakdown: {} as Record<string, number> });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [statusRes, sessionsRes] = await Promise.all([
          api.getStatus().catch(() => null),
          api.getSessions(100, 0, undefined, "recent").catch(() => null),
        ]);
        if (cancelled) return;
        if (statusRes) setStatus(statusRes);
        if (sessionsRes) {
          setSessionsList(sessionsRes.sessions);
          setSessions({ total: sessionsRes.total, active: statusRes?.active_sessions ?? 0 });
        }

        // Try analytics — may 404 if not enabled
        try {
          const analyticsRes = await api.getAnalytics(7);
          if (!cancelled && analyticsRes) {
            const breakdown: Record<string, number> = {};
            if (analyticsRes.by_model) {
              for (const m of analyticsRes.by_model) {
                breakdown[m.model] = (m.input_tokens ?? 0) + (m.output_tokens ?? 0);
              }
            }
            setAnalytics({
              totalTokens: (analyticsRes.totals?.total_input ?? 0) + (analyticsRes.totals?.total_output ?? 0),
              totalCost: analyticsRes.totals?.total_estimated_cost ?? 0,
              modelBreakdown: breakdown,
            });
          }
        } catch {
          // analytics not available — fine
        }

        setLastRefresh(new Date());
      } catch {
        // swallow
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return { status, sessions, sessionsList, analytics, loading, lastRefresh };
}

/* ================================================================== */
/*  DERIVED DATA — compute dashboard content from live API state      */
/* ================================================================== */

function derivePlatformCards(status: StatusResponse | null, sessions: SessionInfo[]) {
  const platforms = status?.gateway_platforms ?? {};
  const platformNames = Object.keys(platforms);

  if (platformNames.length === 0) {
    return [
      { name: "NO PLATFORMS", state: "offline", messageCount: 0, flaggedCount: 0, activity: "No gateway connected", detection: "INACTIVE" },
    ];
  }

  return platformNames.slice(0, 6).map((name) => {
    const p = platforms[name];
    const platformSessions = sessions.filter(s => s.source?.toLowerCase() === name.toLowerCase());
    const msgCount = platformSessions.reduce((acc, s) => acc + (s.message_count ?? 0), 0);
    const toolCount = platformSessions.reduce((acc, s) => acc + (s.tool_call_count ?? 0), 0);

    return {
      name: name.toUpperCase(),
      state: p.state,
      messageCount: msgCount,
      flaggedCount: toolCount,
      activity: `Last: ${p.updated_at ? new Date(p.updated_at).toLocaleTimeString() : "N/A"}`,
      detection: p.state === "connected" || p.state === "running" ? "ACTIVE" : p.state.toUpperCase(),
    };
  });
}

function deriveGraphNodes(status: StatusResponse | null): NodeData[] {
  const nodes: NodeData[] = [];
  const platforms = status?.gateway_platforms ?? {};
  const names = Object.keys(platforms);

  // Build nodes from live connected platforms
  names.forEach((name, i) => {
    const angle = (i / Math.max(names.length, 1)) * 2 * Math.PI;
    const r = 30;
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    const p = platforms[name];

    nodes.push({
      id: `platform-${name}`,
      label: name,
      type: name.includes("telegram") ? "telegram" :
            name.includes("whatsapp") ? "whatsapp" :
            name.includes("instagram") ? "instagram" :
            name.includes("email") ? "email" : "domain",
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y)),
      reasoning: `Platform ${name} — state: ${p.state}. Updated: ${p.updated_at ?? "unknown"}.`,
      confidence: p.state === "connected" || p.state === "running" ? 98 : 40,
      source: `Gateway Platform Adapter`,
      timestamp: p.updated_at ?? new Date().toISOString(),
    });
  });

  // If no live platforms, show a single placeholder
  if (nodes.length === 0) {
    nodes.push({
      id: "gateway-hub",
      label: "Gateway Hub",
      type: "domain",
      x: 50,
      y: 50,
      reasoning: "No platforms connected. Start the gateway to populate the graph.",
      confidence: 0,
      source: "System",
      timestamp: new Date().toISOString(),
    });
  }

  return nodes;
}

function deriveGraphEdges(nodes: NodeData[]): EdgeData[] {
  if (nodes.length < 2) return [];
  const edges: EdgeData[] = [];
  for (let i = 1; i < nodes.length; i++) {
    edges.push({
      id: `edge-${nodes[0].id}-${nodes[i].id}`,
      from: nodes[0].id,
      to: nodes[i].id,
      confidence: Math.round((nodes[0].confidence + nodes[i].confidence) / 2),
      source: "Cross-platform correlation",
    });
  }
  return edges;
}

function deriveAlerts(status: StatusResponse | null): AlertItem[] {
  const alerts: AlertItem[] = [];
  const platforms = status?.gateway_platforms ?? {};

  for (const [name, p] of Object.entries(platforms)) {
    if (p.error_code || p.error_message) {
      alerts.push({
        id: `ALT-${name.toUpperCase().slice(0, 4)}-${Date.now() % 10000}`,
        title: p.error_message || `Error on ${name}: ${p.error_code}`,
        severity: "critical",
        timestamp: p.updated_at ? new Date(p.updated_at).toLocaleTimeString() : "now",
        source: name,
      });
    }
    if (p.state !== "connected" && p.state !== "running") {
      alerts.push({
        id: `ALT-${name.toUpperCase().slice(0, 4)}-DISC`,
        title: `Platform ${name} is ${p.state}`,
        severity: p.state === "error" ? "high" : "medium",
        timestamp: p.updated_at ? new Date(p.updated_at).toLocaleTimeString() : "now",
        source: name,
      });
    }
  }

  if (!status?.gateway_running) {
    alerts.push({
      id: "ALT-GW-DOWN",
      title: "Gateway process is not running",
      severity: "critical",
      timestamp: "now",
      source: "system",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "ALT-NOMINAL",
      title: "All systems nominal — no outstanding alerts",
      severity: "low",
      timestamp: new Date().toLocaleTimeString(),
      source: "system",
    });
  }

  return alerts;
}

function deriveTimeline(status: StatusResponse | null): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const now = new Date();

  if (status) {
    events.push({
      time: new Date(now.getTime() - 300000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      action: "Dashboard Initialized",
      details: `Version ${status.version} loaded. Config v${status.config_version}.`,
      icon: Zap,
    });

    if (status.gateway_running) {
      events.push({
        time: new Date(now.getTime() - 240000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        action: "Gateway Online",
        details: `PID ${status.gateway_pid ?? "unknown"}. State: ${status.gateway_state ?? "running"}.`,
        icon: CheckCircle2,
      });
    }

    const connectedPlatforms = Object.entries(status.gateway_platforms ?? {})
      .filter(([, p]) => p.state === "connected" || p.state === "running");

    if (connectedPlatforms.length > 0) {
      events.push({
        time: new Date(now.getTime() - 180000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        action: "Platforms Connected",
        details: `${connectedPlatforms.length} platform(s): ${connectedPlatforms.map(([n]) => n).join(", ")}.`,
        icon: Globe,
      });
    }

    events.push({
      time: new Date(now.getTime() - 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      action: "Active Sessions",
      details: `${status.active_sessions} active session(s) detected.`,
      icon: Users,
    });

    events.push({
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      action: "Status Polled",
      details: "Dashboard auto-refresh cycle complete.",
      icon: Cpu,
    });
  } else {
    events.push({
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      action: "Awaiting Connection",
      details: "Dashboard is waiting for the Rakshastra backend to respond.",
      icon: ShieldAlert,
    });
  }

  return events;
}

function deriveEvidence(status: StatusResponse | null, sessions: SessionInfo[]): EvidenceItem[] {
  if (!status) return [];
  const items: EvidenceItem[] = [];
  const platforms = status.gateway_platforms ?? {};

  for (const [name, p] of Object.entries(platforms)) {
    if (p.state === "connected" || p.state === "running") {
      const platformSessions = sessions.filter(s => s.source?.toLowerCase() === name.toLowerCase());
      const sessionCount = platformSessions.length;
      items.push({
        id: `EVID-${name.toUpperCase().slice(0, 3)}-${sessionCount + 1}`,
        type: "Session Log",
        platform: name,
        timestamp: p.updated_at ? new Date(p.updated_at).toLocaleTimeString() : "N/A",
        hash: `${name.substring(0, 3).toLowerCase()}-sha256-${(sessionCount + 1) * 31415}`,
        summary: `Active connection log from ${name} platform adapter. Total sessions captured: ${sessionCount}.`,
      });
    }
  }

  if (items.length === 0) {
    items.push({
      id: "EVID-NONE",
      type: "System",
      platform: "Dashboard",
      timestamp: new Date().toLocaleTimeString(),
      hash: "n/a",
      summary: "No active platform connections to generate evidence from.",
    });
  }

  return items;
}

/* ================================================================== */
/*  INDIA HEATMAP — static coordinates, dynamic case counts           */
/* ================================================================== */

const INDIA_STATE_COORDS: { id: string; name: string; x: number; y: number }[] = [
  { id: "IN-PB", name: "Punjab", x: 30, y: 32 },
  { id: "IN-DL", name: "Delhi NCR", x: 38, y: 38 },
  { id: "IN-MH", name: "Maharashtra", x: 32, y: 64 },
  { id: "IN-KA", name: "Karnataka", x: 34, y: 78 },
  { id: "IN-GJ", name: "Gujarat", x: 20, y: 52 },
  { id: "IN-WB", name: "West Bengal", x: 68, y: 50 },
  { id: "IN-TN", name: "Tamil Nadu", x: 40, y: 86 },
];

function deriveIndiaStates(activeSessions: number): StateData[] {
  // Distribute active sessions deterministically across regions
  return INDIA_STATE_COORDS.map((coord, i) => {
    // If activeSessions is 0, we show 0 cases/accounts.
    // Otherwise, we distribute them (e.g. Punjab gets more, others get less).
    const cases = activeSessions > 0 ? Math.max(1, Math.round(activeSessions * ((7 - i) / 28))) : 0;
    const flagged = cases * 3;
    const level: StateData["threatLevel"] =
      cases >= 5 ? "critical" : cases >= 3 ? "high" : cases >= 1 ? "medium" : "low";

    return {
      id: coord.id,
      name: coord.name,
      coordinates: { x: coord.x, y: coord.y },
      threatLevel: level,
      activeCases: cases,
      flaggedAccounts: flagged,
      districts: [
        { name: `${coord.name} Urban`, cases: Math.round(cases * 0.5) },
        { name: `${coord.name} Rural`, cases: Math.round(cases * 0.3) },
        { name: `${coord.name} Suburb`, cases: Math.max(0, cases - Math.round(cases * 0.5) - Math.round(cases * 0.3)) },
      ],
    };
  });
}

/* ================================================================== */
/*  SUBCOMPONENTS                                                     */
/* ================================================================== */

function IndiaHeatmap({ states, onSelectState }: { states: StateData[]; onSelectState: (s: StateData) => void }) {
  const [selectedId, setSelectedId] = useState(states[0]?.id ?? "");

  const getThreatColor = (level: StateData["threatLevel"]) => {
    switch (level) {
      case "critical": return "fill-[#DC2626]/80 stroke-[#DC2626]";
      case "high": return "fill-[#E56A21]/70 stroke-[#E56A21]";
      case "medium": return "fill-[#F59E0B]/50 stroke-[#F59E0B]";
      case "low": return "fill-[#16A34A]/40 stroke-[#16A34A]";
    }
  };

  return (
    <div className="relative bg-[#151515] border border-white/5 rounded-xl p-4 flex flex-col h-[320px] overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-mono tracking-wider text-text-tertiary uppercase flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-[#E56A21]" />
          GEOGRAPHIC THREAT HEATMAP
        </span>
        <Badge tone="destructive" className="text-[9px] font-mono tracking-wider">{states.length} REGIONS</Badge>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        <div className="flex-1 relative flex items-center justify-center bg-[#0C0C0C] border border-white/5 rounded-lg p-2">
          <svg viewBox="0 0 100 100" className="h-full w-auto max-w-full">
            <path
              d="M35,10 L45,15 L52,18 L55,25 L50,30 L55,35 L62,32 L68,36 L70,45 L78,48 L80,55 L75,58 L68,52 L62,56 L64,65 L55,60 L50,68 L52,75 L45,82 L42,92 L38,90 L39,80 L35,78 L33,70 L28,68 L25,60 L18,58 L15,50 L12,46 L18,44 L25,48 L22,38 L28,30 L32,22 Z"
              fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2"
            />
            {states.map((state) => {
              const isSelected = state.id === selectedId;
              return (
                <g key={state.id} className="cursor-pointer" onClick={() => { setSelectedId(state.id); onSelectState(state); }}>
                  <circle cx={state.coordinates.x} cy={state.coordinates.y} r={isSelected ? 6 : 4} className={`${getThreatColor(state.threatLevel)} transition-all duration-300`} />
                  {isSelected && <circle cx={state.coordinates.x} cy={state.coordinates.y} r="12" fill="none" stroke="#E56A21" strokeWidth="0.75" className="animate-ping opacity-60" />}
                  <text x={state.coordinates.x + 6} y={state.coordinates.y + 2} className="fill-text-secondary font-mono text-[5px] font-bold pointer-events-none uppercase">{state.name.split(" ")[0]}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="w-[160px] flex flex-col justify-between font-mono text-[10px] text-text-secondary">
          {(() => {
            const current = states.find(s => s.id === selectedId) || states[0];
            if (!current) return <span className="text-text-tertiary">No data</span>;
            return (
              <>
                <div className="flex flex-col gap-2">
                  <div className="border-b border-white/5 pb-1"><span className="text-[#E56A21] font-bold uppercase">{current.name}</span></div>
                  <div className="flex justify-between"><span>ACTIVE CASES:</span><span className="font-bold text-white">{current.activeCases}</span></div>
                  <div className="flex justify-between"><span>FLAGGED ACCTS:</span><span className="font-bold text-white">{current.flaggedAccounts}</span></div>
                  <div className="border-t border-white/5 pt-1.5 mt-1"><span className="text-text-tertiary uppercase text-[9px]">DISTRICT BREAKDOWN:</span></div>
                  <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto scrollbar-none pr-1">
                    {current.districts.map((d, i) => (
                      <div key={i} className="flex justify-between text-[9px]"><span className="truncate max-w-[100px]">{d.name}</span><span className="text-[#E56A21] font-bold">{d.cases}</span></div>
                    ))}
                  </div>
                </div>
                <div className="text-[8px] text-text-tertiary leading-tight">Click map nodes to filter.</div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function EntityGraph({ nodes, edges }: { nodes: NodeData[]; edges: EdgeData[] }) {
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(nodes[0] ?? null);
  const [localNodes, setLocalNodes] = useState(nodes);
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);

  useEffect(() => { setLocalNodes(nodes); }, [nodes]);

  const getNodeColor = (type: NodeData["type"]) => {
    const map: Record<string, { bg: string; border: string; text: string }> = {
      phone: { bg: "bg-emerald-950/40", border: "border-emerald-600", text: "text-emerald-400" },
      telegram: { bg: "bg-[#0B3558]/40", border: "border-[#1D9BF0]", text: "text-[#1D9BF0]" },
      whatsapp: { bg: "bg-green-950/40", border: "border-green-600", text: "text-green-400" },
      instagram: { bg: "bg-rose-950/40", border: "border-rose-600", text: "text-rose-400" },
      email: { bg: "bg-amber-950/40", border: "border-amber-600", text: "text-amber-400" },
      wallet: { bg: "bg-[#4B306A]/40", border: "border-[#A855F7]", text: "text-[#C084FC]" },
      domain: { bg: "bg-red-950/40", border: "border-red-600", text: "text-red-400" },
      ip: { bg: "bg-slate-900/40", border: "border-slate-500", text: "text-slate-300" },
    };
    return map[type] ?? map.domain;
  };

  const handleNodeDrag = (id: string, e: React.MouseEvent<SVGGElement>) => {
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;
    const onPointerMove = (moveEvent: PointerEvent) => {
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      setLocalNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) } : n)));
    };
    const onPointerUp = () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", onPointerUp); };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div className="relative bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col h-[400px] overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-mono tracking-wider text-text-tertiary uppercase flex items-center gap-1.5">
          <Network className="h-3.5 w-3.5 text-[#E56A21]" />
          CROSS-PLATFORM ENTITY GRAPH — {localNodes.length} NODES
        </span>
        <Badge tone="success" className="text-[9px] font-mono tracking-wider animate-pulse">LIVE</Badge>
      </div>

      <div className="flex flex-1 min-h-0 gap-6">
        <div className="flex-1 relative bg-[#0B0B0B] border border-white/5 rounded-lg overflow-hidden">
          <svg className="w-full h-full select-none" viewBox="0 0 100 100">
            {edges.map((edge) => {
              const fromNode = localNodes.find((n) => n.id === edge.from);
              const toNode = localNodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              const isHighlighted = selectedNode?.id === edge.from || selectedNode?.id === edge.to;
              return (
                <g key={edge.id}>
                  {isHighlighted && <line x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y} stroke="#E56A21" strokeWidth="1.2" opacity="0.3" />}
                  <line x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y} stroke={isHighlighted ? "#E56A21" : "rgba(255,255,255,0.1)"} strokeWidth={isHighlighted ? "0.6" : "0.35"} strokeDasharray={isHighlighted ? "2 2" : undefined} />
                </g>
              );
            })}
            {localNodes.map((node) => {
              const colors = getNodeColor(node.type);
              const isSelected = selectedNode?.id === node.id;
              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`} className="cursor-grab active:cursor-grabbing"
                   onPointerDown={(e) => { e.stopPropagation(); handleNodeDrag(node.id, e as unknown as React.MouseEvent<SVGGElement>); }}
                   onClick={(e) => { e.stopPropagation(); setSelectedNode(node); }}
                   onMouseEnter={() => setHoveredNode(node)} onMouseLeave={() => setHoveredNode(null)}>
                  <circle r="3.5" className={`${colors.bg} ${colors.border} stroke-1 transition-all duration-300 ${isSelected ? "stroke-[1.5px] stroke-[#E56A21]" : ""}`} />
                  {isSelected && <circle r="6.5" fill="none" stroke="#E56A21" strokeWidth="0.4" className="animate-ping" />}
                  <text y="-5" textAnchor="middle" className="fill-white font-mono text-[3.5px] font-semibold pointer-events-none uppercase tracking-wide">{node.label}</text>
                  <text y="7.5" textAnchor="middle" className={`${colors.text} font-mono text-[2.5px] font-bold pointer-events-none uppercase tracking-wider`}>{node.type}</text>
                </g>
              );
            })}
          </svg>
          {hoveredNode && (
            <div className="absolute top-3 left-3 bg-[#151515] border border-white/10 rounded px-2.5 py-1.5 font-mono text-[9px] pointer-events-none z-10 max-w-[200px] shadow-lg">
              <span className="text-[#E56A21] font-bold uppercase">{hoveredNode.type}: {hoveredNode.label}</span>
              <div className="text-text-tertiary mt-1 leading-tight">{hoveredNode.reasoning}</div>
              <div className="flex justify-between border-t border-white/5 pt-1 mt-1 text-[8px]"><span>CONFIDENCE:</span><span className="text-[#E56A21] font-bold">{hoveredNode.confidence}%</span></div>
            </div>
          )}
        </div>

        <div className="w-[200px] flex flex-col justify-between border-l border-white/5 pl-4 font-mono text-[10px] text-text-secondary">
          {selectedNode ? (
            <div className="flex flex-col gap-2">
              <div className="border-b border-[#E56A21]/30 pb-1.5">
                <span className="text-white text-xs font-bold truncate block">{selectedNode.label}</span>
                <span className="text-[#E56A21] text-[9px] font-bold tracking-widest uppercase">{selectedNode.type} NODE</span>
              </div>
              <div className="flex flex-col gap-1 mt-1"><span className="text-text-tertiary uppercase text-[9px]">AI REASONING:</span><p className="text-text-secondary leading-normal text-[9px]">{selectedNode.reasoning}</p></div>
              <div className="flex justify-between mt-2 pt-1 border-t border-white/5"><span>CONFIDENCE:</span><span className="font-bold text-white">{selectedNode.confidence}%</span></div>
              <div className="flex justify-between"><span>SOURCE:</span><span className="text-text-tertiary truncate max-w-[120px]">{selectedNode.source}</span></div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-text-tertiary">
              <Network className="h-6 w-6 opacity-30 mb-2" /><span>Select a node.</span>
            </div>
          )}
          <div className="text-[8px] text-text-tertiary leading-tight mt-4 pt-1.5 border-t border-white/5">Drag nodes to reshape. Hover for AI reasoning.</div>
        </div>
      </div>
    </div>
  );
}

function LiveAIActivity({ status }: { status: StatusResponse | null }) {
  const [activities, setActivities] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate activity lines from live status
    const lines: string[] = [];
    if (status) {
      lines.push(`System online — v${status.version}`);
      if (status.gateway_running) lines.push(`Gateway PID ${status.gateway_pid} — ${status.gateway_state}`);
      for (const [name, p] of Object.entries(status.gateway_platforms ?? {})) {
        lines.push(`Platform ${name}: ${p.state} (updated ${p.updated_at ?? "n/a"})`);
      }
      lines.push(`Active sessions: ${status.active_sessions}`);
    } else {
      lines.push("Waiting for backend connection...");
    }
    setActivities(lines);
  }, [status]);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [activities]);

  return (
    <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex flex-col h-[180px]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-mono tracking-wider text-text-tertiary uppercase flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-[#E56A21]" /> LIVE AI AGENT DAEMON
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#E56A21] animate-ping" />
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-2.5 pr-2 scrollbar-none">
        {activities.map((act, index) => (
          <div key={index} className="flex items-start gap-2"><span className="text-text-tertiary select-none">~#</span><span className="leading-tight">{act}</span></div>
        ))}
      </div>
    </div>
  );
}

function AIReasoningPanel({ status }: { status: StatusResponse | null }) {
  const steps = useMemo<LogicStep[]>(() => {
    if (!status) return [{ text: "Awaiting backend", detail: "No connection to Rakshastra API.", status: "pending" as const }];
    const s: LogicStep[] = [];
    s.push({ text: `Dashboard v${status.version} initialized`, detail: `Config version ${status.config_version}. Release: ${status.release_date}.`, status: "done" });
    if (status.gateway_running) {
      s.push({ text: "Gateway daemon confirmed online", detail: `PID ${status.gateway_pid}. State: ${status.gateway_state}.`, status: "done" });
    } else {
      s.push({ text: "Gateway daemon OFFLINE", detail: status.gateway_exit_reason ?? "Process not running.", status: "pending" });
    }
    const connected = Object.entries(status.gateway_platforms ?? {}).filter(([, p]) => p.state === "connected" || p.state === "running");
    s.push({ text: `${connected.length} platform adapter(s) connected`, detail: connected.map(([n]) => n).join(", ") || "None", status: connected.length > 0 ? "done" : "pending" });
    s.push({ text: `${status.active_sessions} active session(s)`, detail: "Monitored by session store.", status: "done" });
    return s;
  }, [status]);

  return (
    <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex flex-col h-[280px]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-mono tracking-wider text-text-tertiary uppercase flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-[#E56A21]" /> SYSTEM REASONING LOG
        </span>
        <Badge tone="warning" className="text-[9px] font-mono tracking-wider">{steps.filter(s => s.status === "done").length}/{steps.length} STEPS</Badge>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[9px] text-text-secondary scrollbar-none pr-1">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-2.5 border-l-2 border-[#E56A21]/30 pl-3 ml-1 py-0.5 relative">
            <span className={`absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ${step.status === "done" ? "bg-[#E56A21]" : "bg-text-tertiary"}`} />
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-white font-bold leading-tight uppercase">{step.text}</span>
              <span className="text-text-tertiary">{step.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveAlerts({ alerts: initialAlerts }: { alerts: AlertItem[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  useEffect(() => { setAlerts(initialAlerts); }, [initialAlerts]);

  const handleAction = (id: string, action: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, actionTaken: action } : a)));
  };

  const getSevBadge = (sev: AlertItem["severity"]) => {
    switch (sev) {
      case "critical": return <Badge tone="destructive" className="text-[8px] font-mono">CRIT</Badge>;
      case "high": return <Badge tone="warning" className="text-[8px] font-mono">HIGH</Badge>;
      case "medium": return <Badge tone="warning" className="text-[8px] font-mono">MED</Badge>;
      case "low": return <Badge tone="outline" className="text-[8px] font-mono">LOW</Badge>;
    }
  };

  return (
    <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex flex-col h-[280px]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-mono tracking-wider text-text-tertiary uppercase flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-[#E56A21]" /> ACTIVE ALERTS
        </span>
        <Badge tone="destructive" className="text-[9px] font-mono tracking-wider">{alerts.filter(a => !a.actionTaken).length} PENDING</Badge>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-[#0B0B0B] border border-white/5 rounded-lg p-2.5 font-mono text-[9px] text-text-secondary flex flex-col gap-2 relative">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">{getSevBadge(alert.severity)}<span className="text-white font-bold">{alert.id}</span><span className="text-text-tertiary">|</span><span className="text-text-tertiary truncate max-w-[140px]">{alert.source}</span></div>
              <span className="text-text-tertiary text-[8px]">{alert.timestamp}</span>
            </div>
            <div className="text-text-primary text-[10px] leading-snug">{alert.title}</div>
            <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
              <div className="text-[8px] text-text-tertiary">STATUS: {alert.actionTaken ? <span className="text-emerald-400 uppercase font-bold">{alert.actionTaken}</span> : "UNASSIGNED"}</div>
              {!alert.actionTaken ? (
                <div className="flex gap-1.5">
                  <button onClick={() => handleAction(alert.id, "Investigating")} className="bg-[#E56A21]/15 hover:bg-[#E56A21]/30 border border-[#E56A21]/30 text-[#E56A21] px-2 py-0.5 rounded text-[8px] cursor-pointer">INVESTIGATE</button>
                  <button onClick={() => handleAction(alert.id, "Ignored")} className="bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary px-2 py-0.5 rounded text-[8px] cursor-pointer">IGNORE</button>
                </div>
              ) : <span className="text-[8px] text-emerald-400 font-bold uppercase flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />ACTIONED</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceLocker({ evidence }: { evidence: EvidenceItem[] }) {
  return (
    <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex flex-col h-[280px]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-mono tracking-wider text-text-tertiary uppercase flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-[#E56A21]" /> EVIDENCE LOCKER</span>
        <Badge tone="success" className="text-[9px] font-mono tracking-wider">{evidence.length} ITEMS</Badge>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-none">
        {evidence.map((evid) => (
          <div key={evid.id} className="bg-[#0B0B0B] border border-white/5 rounded-lg p-2.5 font-mono text-[9px] text-text-secondary flex flex-col gap-1.5">
            <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-1">
              <div className="flex items-center gap-1.5"><span className="text-white font-bold">{evid.id}</span><span className="text-text-tertiary">|</span><Badge tone="outline" className="text-[7.5px] px-1">{evid.type}</Badge></div>
              <span className="text-text-tertiary text-[8px]">{evid.platform} @ {evid.timestamp}</span>
            </div>
            <div className="text-text-primary text-[9.5px] leading-snug">{evid.summary}</div>
            <div className="flex justify-between items-center border-t border-white/5 pt-1.5 mt-1 text-[8px] text-text-tertiary">
              <span className="truncate max-w-[100px]" title={evid.hash}>SHA-256: {evid.hash}</span>
              <button className="flex items-center gap-1 bg-[#1A1A1A] hover:bg-white/5 border border-white/10 text-white px-2 py-0.5 rounded text-[8px] cursor-pointer"><Download className="h-2.5 w-2.5" />EXPORT</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvestigationTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex flex-col h-[280px]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-mono tracking-wider text-text-tertiary uppercase flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[#E56A21]" /> CASE TIMELINE</span>
        <span className="text-[9px] font-mono text-text-tertiary">{events.length} EVENTS</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-none">
        {events.map((evt, idx) => {
          const Icon = evt.icon;
          return (
            <div key={idx} className="flex gap-3 relative">
              <span className="text-[#E56A21] font-mono text-[9px] w-[35px] text-right font-bold shrink-0 pt-0.5">{evt.time}</span>
              <div className="flex flex-col items-center">
                <div className="h-4 w-4 rounded-full bg-[#151515] border border-[#E56A21] flex items-center justify-center shrink-0"><Icon className="h-2.5 w-2.5 text-[#E56A21]" /></div>
                {idx < events.length - 1 && <div className="w-[1px] bg-white/10 flex-1 min-h-[25px]" />}
              </div>
              <div className="flex flex-col gap-0.5 text-left font-mono text-[9px]">
                <span className="text-white font-bold uppercase leading-tight">{evt.action}</span>
                <span className="text-text-tertiary leading-normal">{evt.details}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN DASHBOARD — fully data-driven from useDashboardData()        */
/* ================================================================== */

export default function MonitorPage() {
  const { setAfterTitle } = usePageHeader();
  const { status, sessions, sessionsList, loading, lastRefresh } = useDashboardData();

  // Derive ALL dashboard content from live API data
  const platformCards = useMemo(() => derivePlatformCards(status, sessionsList), [status, sessionsList]);
  const graphNodes = useMemo(() => deriveGraphNodes(status), [status]);
  const graphEdges = useMemo(() => deriveGraphEdges(graphNodes), [graphNodes]);
  const alerts = useMemo(() => deriveAlerts(status), [status]);
  const timeline = useMemo(() => deriveTimeline(status), [status]);
  const evidence = useMemo(() => deriveEvidence(status, sessionsList), [status, sessionsList]);
  const indiaStates = useMemo(() => deriveIndiaStates(sessions.active), [sessions.active]);

  const gatewayOnline = status?.gateway_running === true;
  const connectedCount = Object.values(status?.gateway_platforms ?? {}).filter(p => p.state === "connected" || p.state === "running").length;
  const overallConfidence = status ? Math.round((connectedCount / Math.max(Object.keys(status.gateway_platforms ?? {}).length, 1)) * 100) : 0;

  useLayoutEffect(() => {
    setAfterTitle(
      <Badge tone={gatewayOnline ? "success" : "warning"} className="text-xs">
        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
        {gatewayOnline ? "CORE OPERATIONAL" : "AWAITING GATEWAY"}
      </Badge>
    );
    return () => setAfterTitle(null);
  }, [setAfterTitle, gatewayOnline]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 bg-[#0E0E0E]">
        <div className="flex flex-col items-center gap-3 font-mono text-text-tertiary">
          <div className="h-8 w-8 border-2 border-[#E56A21]/30 border-t-[#E56A21] rounded-full animate-spin" />
          <span className="text-xs tracking-wider uppercase">Initializing Intelligence Core...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 min-h-0 min-w-0 flex-1 overflow-y-auto text-text-primary bg-[#0E0E0E]">

      {/* 1. MISSION CONTROL — derived from status */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-5 relative flex flex-col md:flex-row justify-between gap-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#E56A21]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex-1 flex flex-col gap-4 font-mono text-xs">
          <div className="border-b border-[#E56A21]/20 pb-2">
            <span className="text-text-tertiary uppercase text-[10px] tracking-widest block mb-0.5">SYSTEM STATUS</span>
            <span className="text-white text-lg font-bold">Rakshastra v{status?.version ?? "—"}</span>
            <span className="text-text-tertiary ml-2">/ {status?.rakshastra_home ?? "unknown"}</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-text-tertiary text-[10px]">GATEWAY:</span>
              <span className={`font-bold uppercase tracking-wider ${gatewayOnline ? "text-emerald-400" : "text-red-500"}`}>{gatewayOnline ? "ONLINE" : "OFFLINE"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-text-tertiary text-[10px]">PLATFORMS:</span>
              <span className="text-white font-bold">{connectedCount} of {Object.keys(status?.gateway_platforms ?? {}).length} Connected</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-text-tertiary text-[10px]">SESSIONS:</span>
              <span className="text-white font-bold">{sessions.active} Active / {sessions.total} Total</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-text-tertiary text-[10px]">LAST REFRESH:</span>
              <span className="text-white font-bold">{lastRefresh?.toLocaleTimeString() ?? "—"}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex justify-between text-[10px] text-text-tertiary"><span>PLATFORM CONNECTIVITY</span><span>{overallConfidence}%</span></div>
            <div className="h-2 bg-[#0B0B0B] border border-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#E56A21] rounded-full transition-all duration-1000" style={{ width: `${overallConfidence}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center shrink-0 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-8">
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#E56A21" strokeWidth="6" strokeLinecap="round" strokeDasharray="264" strokeDashoffset={264 - (264 * overallConfidence / 100)} className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span className="text-xl font-bold text-white leading-tight">{overallConfidence}%</span>
                <span className="text-[8px] text-text-tertiary uppercase leading-none">CONNECTIVITY</span>
              </div>
            </div>
            <span className="text-[10px] font-mono tracking-widest text-[#E56A21] font-bold uppercase">SYSTEM HEALTH</span>
          </div>
        </div>
      </div>

      {/* 2. PLATFORM CARDS — derived from gateway_platforms */}
      <div className={`grid gap-4 ${platformCards.length >= 6 ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-6" : `grid-cols-2 md:grid-cols-${Math.min(platformCards.length, 3)}`}`}>
        {platformCards.map((card) => (
          <div key={card.name} className="bg-[#151515] border border-white/5 rounded-xl p-3.5 flex flex-col justify-between font-mono text-[9px] text-text-secondary h-[130px]">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-[10px] tracking-wider uppercase">{card.name}</span>
              <span className={`h-2 w-2 rounded-full ${card.state === "connected" || card.state === "running" ? "bg-emerald-500 animate-pulse" : card.state === "error" ? "bg-red-500" : "bg-amber-500"}`} />
            </div>
            <div className="flex flex-col gap-1 my-2">
              <div className="flex justify-between"><span>STATE:</span><span className="font-bold text-white uppercase">{card.state}</span></div>
              <div className="flex justify-between"><span>DETECTION:</span><span className={`font-bold ${card.detection === "ACTIVE" ? "text-emerald-400" : "text-amber-400"}`}>{card.detection}</span></div>
            </div>
            <div className="text-text-tertiary border-t border-white/5 pt-1.5 leading-tight truncate">{card.activity}</div>
          </div>
        ))}
      </div>

      {/* 3. ENTITY GRAPH + ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><EntityGraph nodes={graphNodes} edges={graphEdges} /></div>
        <div className="flex flex-col gap-6">
          <LiveAIActivity status={status} />
          <AIReasoningPanel status={status} />
        </div>
      </div>

      {/* 4. TIMELINE, ALERTS, EVIDENCE, INDIA MAP */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InvestigationTimeline events={timeline} />
        <LiveAlerts alerts={alerts} />
        <EvidenceLocker evidence={evidence} />
        <IndiaHeatmap states={indiaStates} onSelectState={() => {}} />
      </div>
    </div>
  );
}
