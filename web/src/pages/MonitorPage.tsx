import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Globe,
  Shield,
  Server,
  Database,
  Users,
  Wifi,
  Lock,
  Eye,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Network,
  RotateCw,
  Terminal,
} from "lucide-react";
import { usePageHeader } from "@/contexts/usePageHeader";
import { Badge } from "@nous-research/ui/ui/components/badge";
import { Button } from "@nous-research/ui/ui/components/button";
import { Spinner } from "@nous-research/ui/ui/components/spinner";
import { api } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Mock data — mirrors rakshastra_core/models                         */
/* ------------------------------------------------------------------ */

type Severity = "critical" | "high" | "medium" | "low" | "info";

interface ThreatEntry {
  id: string;
  title: string;
  severity: Severity;
  risk_score: number;
  mitre_tactics: string[];
  host: string;
  tool: string;
  recommended_actions: string[];
  attack_path: string[];
  timestamp: string;
}

interface AssetCount {
  type: string;
  label: string;
  count: number;
  icon: typeof Server;
  color: string;
}

interface TimelinePoint {
  hour: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const MOCK_THREATS: ThreatEntry[] = [
  {
    id: "r-001",
    title: "Exposed Credential/Secret: AWS_SECRET_ACCESS_KEY in .env",
    severity: "critical",
    risk_score: 8.7,
    mitre_tactics: ["TA0006"],
    host: "prod-api-01.rakshastra.local",
    tool: "secret-scanner",
    recommended_actions: [
      "Revoke the exposed key/token immediately.",
      "Rotate and update credentials in all referencing services.",
    ],
    attack_path: ["External/Attacker -> prod-api-01", "prod-api-01 -> S3 Bucket: customer-data", "prod-api-01 -> RDS: prod-db"],
    timestamp: "2 min ago",
  },
  {
    id: "r-002",
    title: "Known Vulnerability (CVE-2024-3094): xz-utils backdoor",
    severity: "critical",
    risk_score: 9.1,
    mitre_tactics: ["TA0002", "TA0004"],
    host: "build-runner-03.ci.local",
    tool: "trivy",
    recommended_actions: [
      "Upgrade package/dependency to remediate CVE-2024-3094.",
      "Audit build artifacts for compromise indicators.",
    ],
    attack_path: ["External/Attacker -> build-runner-03", "build-runner-03 -> artifact-registry"],
    timestamp: "8 min ago",
  },
  {
    id: "r-003",
    title: "Privilege Escalation Vector: Docker socket mounted with --privileged",
    severity: "high",
    risk_score: 6.4,
    mitre_tactics: ["TA0004", "TA0002"],
    host: "k8s-worker-07.prod.local",
    tool: "container-audit",
    recommended_actions: [
      "Run container without privilege flags.",
      "Restrict SUID permissions and monitor process actions.",
    ],
    attack_path: ["External/Attacker -> k8s-worker-07", "k8s-worker-07 -> host-root"],
    timestamp: "15 min ago",
  },
  {
    id: "r-004",
    title: "Network Exposure: SSH (port 22) open to 0.0.0.0/0",
    severity: "high",
    risk_score: 5.8,
    mitre_tactics: ["TA0001", "TA0043"],
    host: "gateway-lb.edge.local",
    tool: "nmap",
    recommended_actions: [
      "Close unnecessary exposed ports at the firewall layer.",
      "Restrict network access to authorized IPs only.",
    ],
    attack_path: ["External/Attacker -> gateway-lb"],
    timestamp: "22 min ago",
  },
  {
    id: "r-005",
    title: "Known Vulnerability (CVE-2023-44487): HTTP/2 Rapid Reset",
    severity: "medium",
    risk_score: 3.9,
    mitre_tactics: ["TA0002"],
    host: "nginx-proxy-02.dmz.local",
    tool: "trivy",
    recommended_actions: ["Upgrade package/dependency to remediate CVE-2023-44487."],
    attack_path: ["External/Attacker -> nginx-proxy-02"],
    timestamp: "45 min ago",
  },
  {
    id: "r-006",
    title: "Network Exposure: PostgreSQL (5432) reachable from staging",
    severity: "low",
    risk_score: 1.2,
    mitre_tactics: ["TA0043"],
    host: "staging-db.internal.local",
    tool: "nmap",
    recommended_actions: ["Restrict network access to authorized IPs only."],
    attack_path: ["staging-network -> staging-db"],
    timestamp: "1h ago",
  },
];

const MOCK_ASSETS: AssetCount[] = [
  { type: "host", label: "Hosts", count: 47, icon: Server, color: "#ff7d36" },
  { type: "container", label: "Containers", count: 128, icon: Database, color: "#4d9cff" },
  { type: "service", label: "Services", count: 34, icon: Globe, color: "#00ffaa" },
  { type: "network", label: "Networks", count: 8, icon: Network, color: "#7c85ff" },
  { type: "user", label: "Users", count: 156, icon: Users, color: "#e962bf" },
  { type: "firewall", label: "Firewalls", count: 12, icon: Shield, color: "#ffa828" },
  { type: "secret", label: "Secrets", count: 89, icon: Lock, color: "#ff4b4b" },
  { type: "vpn", label: "VPNs", count: 6, icon: Wifi, color: "#26f2d5" },
];

const MOCK_TIMELINE: TimelinePoint[] = [
  { hour: "00", critical: 0, high: 1, medium: 3, low: 2 },
  { hour: "02", critical: 0, high: 0, medium: 2, low: 4 },
  { hour: "04", critical: 1, high: 2, medium: 1, low: 3 },
  { hour: "06", critical: 0, high: 1, medium: 4, low: 5 },
  { hour: "08", critical: 2, high: 3, medium: 6, low: 4 },
  { hour: "10", critical: 1, high: 4, medium: 5, low: 3 },
  { hour: "12", critical: 0, high: 2, medium: 7, low: 6 },
  { hour: "14", critical: 3, high: 5, medium: 4, low: 2 },
  { hour: "16", critical: 2, high: 3, medium: 5, low: 7 },
  { hour: "18", critical: 1, high: 2, medium: 3, low: 4 },
  { hour: "20", critical: 0, high: 1, medium: 4, low: 5 },
  { hour: "22", critical: 1, high: 2, medium: 2, low: 3 },
];

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#ff4b4b",
  high: "#ffa828",
  medium: "#ffcc2a",
  low: "#4d9cff",
  info: "#7c85ff",
};

const SEVERITY_BG: Record<Severity, string> = {
  critical: "rgba(255,75,75,0.12)",
  high: "rgba(255,168,40,0.12)",
  medium: "rgba(255,204,42,0.10)",
  low: "rgba(77,156,255,0.10)",
  info: "rgba(124,133,255,0.08)",
};

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */

function useAnimatedCounter(target: number, duration = 1200) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return current;
}

/* ------------------------------------------------------------------ */
/*  Circular gauge component                                           */
/* ------------------------------------------------------------------ */

function CircularGauge({
  value,
  max,
  label,
  color,
  suffix = "",
}: {
  value: number;
  max: number;
  label: string;
  color: string;
  suffix?: string;
}) {
  const animated = useAnimatedCounter(value);
  const pct = Math.min(animated / max, 1);
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference * (1 - pct);

  return (
    <div
      className="animate-fade-in"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <div style={{ position: "relative", width: 96, height: 96 }}>
        <svg viewBox="0 0 96 96" style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <span
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color,
              fontFamily: "var(--theme-font-mono)",
            }}
          >
            {animated}
            {suffix}
          </span>
        </div>
      </div>
      <span
        style={{
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.5)",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Glass card component                                               */
/* ------------------------------------------------------------------ */

function GlassCard({
  children,
  className = "",
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-fade-in ${className}`}
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "0.75rem",
        padding: "1.25rem",
        backdropFilter: "blur(12px)",
        animationDelay: `${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section heading                                                    */
/* ------------------------------------------------------------------ */

function SectionLabel({ icon: Icon, label }: { icon: typeof Activity; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "1rem",
      }}
    >
      <Icon style={{ width: 14, height: 14, opacity: 0.5 }} />
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          opacity: 0.5,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini sparkline bar chart for timeline                              */
/* ------------------------------------------------------------------ */

function TimelineChart({ data }: { data: TimelinePoint[] }) {
  const maxVal = Math.max(...data.map((d) => d.critical + d.high + d.medium + d.low), 1);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "6px",
        height: "120px",
        padding: "0 4px",
      }}
    >
      {data.map((point, i) => {
        const total = point.critical + point.high + point.medium + point.low;
        const h = (total / maxVal) * 100;
        const critH = (point.critical / maxVal) * 100;
        const highH = (point.high / maxVal) * 100;
        const medH = (point.medium / maxVal) * 100;
        const lowH = (point.low / maxVal) * 100;

        return (
          <div
            key={i}
            className="animate-fade-in"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              animationDelay: `${i * 0.04}s`,
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${h}%`,
                minHeight: 2,
                display: "flex",
                flexDirection: "column",
                borderRadius: "3px 3px 0 0",
                overflow: "hidden",
              }}
            >
              {critH > 0 && (
                <div
                  style={{
                    height: `${(critH / h) * 100}%`,
                    background: SEVERITY_COLORS.critical,
                    minHeight: 2,
                  }}
                />
              )}
              {highH > 0 && (
                <div
                  style={{
                    height: `${(highH / h) * 100}%`,
                    background: SEVERITY_COLORS.high,
                    minHeight: 2,
                  }}
                />
              )}
              {medH > 0 && (
                <div
                  style={{
                    height: `${(medH / h) * 100}%`,
                    background: SEVERITY_COLORS.medium,
                    minHeight: 2,
                    opacity: 0.8,
                  }}
                />
              )}
              {lowH > 0 && (
                <div
                  style={{
                    height: `${(lowH / h) * 100}%`,
                    background: SEVERITY_COLORS.low,
                    minHeight: 2,
                    opacity: 0.6,
                  }}
                />
              )}
            </div>
            <span
              style={{
                fontSize: "0.6rem",
                color: "rgba(255,255,255,0.3)",
                fontFamily: "var(--theme-font-mono)",
              }}
            >
              {point.hour}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Risk score six-factor breakdown bar                                */
/* ------------------------------------------------------------------ */

function RiskFactorBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span
        style={{
          width: "6.5rem",
          fontSize: "0.65rem",
          color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
      <span
        style={{
          fontSize: "0.65rem",
          color,
          fontFamily: "var(--theme-font-mono)",
          fontWeight: 700,
          width: "2.5rem",
          textAlign: "right",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

/* ================================================================== */
/*  MonitorPage                                                        */
/* ================================================================== */

export default function MonitorPage() {
  const { setAfterTitle } = usePageHeader();
  const [liveCount, setLiveCount] = useState(0);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [retrying, setRetrying] = useState(false);

  // Check connectivity to Python backend gateway
  const checkConnection = useCallback((isRetry = false) => {
    if (isRetry) setRetrying(true);
    api.getStatus()
      .then(() => {
        setConnected(true);
        setChecking(false);
        setRetrying(false);
      })
      .catch(() => {
        setConnected(false);
        setChecking(false);
        setRetrying(false);
      });
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Simulate a live counter incrementing when connected
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => {
      setLiveCount((c) => c + Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(id);
  }, [connected]);

  useLayoutEffect(() => {
    if (connected) {
      setAfterTitle(
        <Badge tone="success" className="text-xs">
          <span
            className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current"
          />
          Live
        </Badge>,
      );
    } else {
      setAfterTitle(
        <Badge tone="warning" className="text-xs">
          Offline
        </Badge>,
      );
    }
    return () => setAfterTitle(null);
  }, [setAfterTitle, connected]);

  const totalThreats = MOCK_THREATS.length;
  const critCount = MOCK_THREATS.filter((t) => t.severity === "critical").length;
  const highCount = MOCK_THREATS.filter((t) => t.severity === "high").length;
  const avgScore =
    MOCK_THREATS.reduce((s, t) => s + t.risk_score, 0) / totalThreats;

  const animatedTotal = useAnimatedCounter(totalThreats);
  const animatedCrit = useAnimatedCounter(critCount);
  const animatedHigh = useAnimatedCounter(highCount);
  const animatedAvg = useAnimatedCounter(Math.round(avgScore * 10));

  const [expandedThreat, setExpandedThreat] = useState<string | null>(null);

  // ── Render Loading State ─────────────────────────────────────────
  if (checking) {
    return (
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100vh - 8rem)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Spinner />
          <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)" }}>
            Verifying Gateway Connection...
          </span>
        </div>
      </div>
    );
  }

  // ── Render Connection Error State ─────────────────────────────────
  if (!connected) {
    return (
      <div
        className="animate-fade-in"
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          height: "calc(100vh - 8rem)",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            width: "100%",
            background: "rgba(10, 9, 8, 0.65)",
            border: "1px solid rgba(255, 125, 54, 0.15)",
            boxShadow: "0 8px 32px rgba(255, 125, 54, 0.05), inset 0 0 12px rgba(255, 125, 54, 0.03)",
            borderRadius: "1rem",
            padding: "2.5rem 2rem",
            backdropFilter: "blur(20px)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "rgba(255, 125, 54, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255, 125, 54, 0.25)",
            }}
          >
            <Activity
              className="scanning-dot"
              style={{
                width: 28,
                height: 28,
                color: "#ff7d36",
                animation: "scanPulse 1.8s infinite ease-in-out",
              }}
            />
          </div>

          <div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#f6f4f2",
                marginBottom: "0.5rem",
                letterSpacing: "-0.01em",
              }}
            >
              Rakshastra Gateway Offline
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.45)",
                lineHeight: 1.5,
              }}
            >
              The Phase 3G Monitoring engine requires an active connection to the Rakshastra API Gateway. Start the local backend server to load real-time analytics.
            </p>
          </div>

          {/* Guidelines Block */}
          <div
            style={{
              width: "100%",
              background: "rgba(0, 0, 0, 0.25)",
              border: "1px solid rgba(255,255,255,0.04)",
              borderRadius: "0.5rem",
              padding: "1rem",
              textAlign: "left",
              fontFamily: "var(--theme-font-mono)",
              fontSize: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255,255,255,0.3)" }}>
              <Terminal style={{ width: 14, height: 14 }} />
              <span>START BACKEND GATEWAY:</span>
            </div>
            <code style={{ color: "#ff7d36", display: "block", wordBreak: "break-all" }}>
              .\.venv\Scripts\python -m rakshastra_cli.main dashboard --no-open
            </code>
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.65rem", marginTop: "4px" }}>
              * Runs the FastAPI administration server on port 9119
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
            <Button
              style={{
                flex: 1,
                background: "linear-gradient(135deg, #ff7d36, #ff4b4b)",
                border: "none",
                fontWeight: 700,
                color: "#0a0908",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 15px rgba(255, 125, 54, 0.2)",
              }}
              disabled={retrying}
              onClick={() => checkConnection(true)}
            >
              {retrying ? (
                <>
                  <Spinner style={{ width: 14, height: 14 }} />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <RotateCw style={{ width: 14, height: 14 }} />
                  <span>Retry Connection</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render Connected State (Full Dashboard) ──────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        maxWidth: "1400px",
        paddingBottom: "2rem",
        overflow: "auto",
        maxHeight: "calc(100dvh - 6rem)",
      }}
    >
      {/* ── Summary stat cards ────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {[
          {
            label: "Total Threats",
            value: animatedTotal,
            icon: AlertTriangle,
            color: "#ff7d36",
          },
          {
            label: "Critical",
            value: animatedCrit,
            icon: AlertCircle,
            color: SEVERITY_COLORS.critical,
          },
          {
            label: "High",
            value: animatedHigh,
            icon: TrendingUp,
            color: SEVERITY_COLORS.high,
          },
          {
            label: "Avg Risk Score",
            value: (animatedAvg / 10).toFixed(1),
            icon: Zap,
            color: "#00ffaa",
          },
        ].map((stat, i) => (
          <GlassCard key={stat.label} delay={i * 0.06}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.4)",
                    marginBottom: "0.25rem",
                    fontWeight: 600,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    color: stat.color,
                    fontFamily: "var(--theme-font-mono)",
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
              </div>
              <stat.icon
                style={{
                  width: 28,
                  height: 28,
                  color: stat.color,
                  opacity: 0.3,
                }}
              />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ── Timeline + Risk Breakdown row ─────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {/* Threat Activity Timeline */}
        <GlassCard delay={0.15}>
          <SectionLabel icon={Activity} label="Threat Activity — Last 24h" />
          <TimelineChart data={MOCK_TIMELINE} />
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginTop: "0.75rem",
              justifyContent: "center",
            }}
          >
            {(["critical", "high", "medium", "low"] as Severity[]).map((sev) => (
              <div
                key={sev}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.6rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: SEVERITY_COLORS[sev],
                  }}
                />
                {sev}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Risk Score Breakdown (top threat) */}
        <GlassCard delay={0.2}>
          <SectionLabel icon={Shield} label="Top Risk — Six-Factor Breakdown" />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${SEVERITY_COLORS.critical}30 0%, transparent 70%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${SEVERITY_COLORS.critical}60`,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--theme-font-mono)",
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: SEVERITY_COLORS.critical,
                }}
              >
                {MOCK_THREATS[0].risk_score}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.85)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {MOCK_THREATS[1].title.slice(0, 50)}…
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "rgba(255,255,255,0.4)",
                  marginTop: 2,
                }}
              >
                {MOCK_THREATS[1].host}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <RiskFactorBar label="Likelihood" value={0.9} color={SEVERITY_COLORS.critical} />
            <RiskFactorBar label="Impact" value={0.9} color={SEVERITY_COLORS.high} />
            <RiskFactorBar label="Exploitability" value={0.8} color={SEVERITY_COLORS.medium} />
            <RiskFactorBar label="Exposure" value={0.7} color="#4d9cff" />
            <RiskFactorBar label="Business Crit." value={1.0} color="#00ffaa" />
            <RiskFactorBar label="Internet Exp." value={0.5} color="#7c85ff" />
          </div>
        </GlassCard>
      </div>

      {/* ── Infrastructure Graph + System Health row ──────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {/* Infrastructure Graph Summary */}
        <GlassCard delay={0.25}>
          <SectionLabel icon={Network} label="Infrastructure Overview" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              gap: "0.5rem",
            }}
          >
            {MOCK_ASSETS.map((asset) => {
              const Icon = asset.icon;
              return (
                <div
                  key={asset.type}
                  className="animate-fade-in"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "0.75rem 0.5rem",
                    borderRadius: "0.5rem",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    gap: "0.35rem",
                    transition: "all 0.3s ease",
                    cursor: "default",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      `${asset.color}10`;
                    (e.currentTarget as HTMLElement).style.borderColor =
                      `${asset.color}30`;
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.02)";
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "rgba(255,255,255,0.04)";
                  }}
                >
                  <Icon style={{ width: 18, height: 18, color: asset.color, opacity: 0.7 }} />
                  <span
                    style={{
                      fontFamily: "var(--theme-font-mono)",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: asset.color,
                    }}
                  >
                    {asset.count}
                  </span>
                  <span
                    style={{
                      fontSize: "0.55rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "rgba(255,255,255,0.35)",
                      fontWeight: 600,
                    }}
                  >
                    {asset.label}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* System Health Gauges */}
        <GlassCard delay={0.3}>
          <SectionLabel icon={BarChart3} label="System Health" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
              gap: "0.75rem",
              justifyItems: "center",
            }}
          >
            <CircularGauge value={67} max={100} label="CPU" color="#ff7d36" suffix="%" />
            <CircularGauge value={42} max={100} label="Memory" color="#4d9cff" suffix="%" />
            <CircularGauge value={3} max={20} label="Sessions" color="#00ffaa" />
            <CircularGauge value={84} max={100} label="Scan Coverage" color="#7c85ff" suffix="%" />
          </div>
        </GlassCard>
      </div>

      {/* ── Active Threats Table ──────────────────────────────── */}
      <GlassCard delay={0.35}>
        <SectionLabel icon={Eye} label="Active Threats" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            overflow: "hidden",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 90px 120px 100px",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              fontSize: "0.6rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.02)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span>Severity</span>
            <span>Threat</span>
            <span>Score</span>
            <span>Host</span>
            <span>Time</span>
          </div>

          {/* Table rows */}
          {MOCK_THREATS.map((threat, i) => (
            <div key={threat.id}>
              <div
                className="animate-fade-in"
                onClick={() =>
                  setExpandedThreat(
                    expandedThreat === threat.id ? null : threat.id,
                  )
                }
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 90px 120px 100px",
                  gap: "0.5rem",
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.75rem",
                  alignItems: "center",
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  background:
                    expandedThreat === threat.id
                      ? "rgba(255,125,54,0.05)"
                      : "transparent",
                  transition: "background 0.2s ease",
                  animationDelay: `${0.35 + i * 0.05}s`,
                }}
                onMouseOver={(e) => {
                  if (expandedThreat !== threat.id)
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.02)";
                }}
                onMouseOut={(e) => {
                  if (expandedThreat !== threat.id)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
              >
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "3px",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: SEVERITY_COLORS[threat.severity],
                      background: SEVERITY_BG[threat.severity],
                    }}
                  >
                    {threat.severity}
                  </span>
                </span>
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {threat.title}
                </span>
                <span
                  style={{
                    fontFamily: "var(--theme-font-mono)",
                    fontWeight: 700,
                    color:
                      threat.risk_score >= 8
                        ? SEVERITY_COLORS.critical
                        : threat.risk_score >= 5
                          ? SEVERITY_COLORS.high
                          : SEVERITY_COLORS.medium,
                  }}
                >
                  {threat.risk_score.toFixed(1)}
                </span>
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "var(--theme-font-mono)",
                    fontSize: "0.65rem",
                  }}
                >
                  {threat.host.split(".")[0]}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: "0.65rem",
                  }}
                >
                  {threat.timestamp}
                </span>
              </div>

              {/* Expanded detail */}
              {expandedThreat === threat.id && (
                <div
                  className="animate-fade-in"
                  style={{
                    padding: "1rem 1.25rem",
                    background: "rgba(255,125,54,0.03)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    fontSize: "0.75rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.6rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "rgba(255,255,255,0.3)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Attack Path
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      {threat.attack_path.map((step, j) => (
                        <div
                          key={j}
                          style={{
                            color: "rgba(255,255,255,0.6)",
                            fontFamily: "var(--theme-font-mono)",
                            fontSize: "0.65rem",
                            paddingLeft: j * 12,
                          }}
                        >
                          {j > 0 && "↳ "}
                          {step}
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: "0.75rem",
                        display: "flex",
                        gap: "0.35rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {threat.mitre_tactics.map((tac) => (
                        <span
                          key={tac}
                          style={{
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontSize: "0.6rem",
                            fontFamily: "var(--theme-font-mono)",
                            fontWeight: 600,
                            background: "rgba(124,133,255,0.12)",
                            color: "#7c85ff",
                          }}
                        >
                          {tac}
                        </span>
                      ))}
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "3px",
                          fontSize: "0.6rem",
                          fontFamily: "var(--theme-font-mono)",
                          fontWeight: 600,
                          background: "rgba(0,255,170,0.08)",
                          color: "#00ffaa",
                        }}
                      >
                        {threat.tool}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.6rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "rgba(255,255,255,0.3)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Recommended Actions
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem",
                      }}
                    >
                      {threat.recommended_actions.map((action, j) => (
                        <li
                          key={j}
                          style={{
                            color: "rgba(255,255,255,0.6)",
                            fontSize: "0.7rem",
                            lineHeight: 1.4,
                          }}
                        >
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ── Events counter in footer ──────────────────────────── */}
      <div
        className="animate-fade-in"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "0.5rem 0",
          fontSize: "0.65rem",
          color: "rgba(255,255,255,0.25)",
          animationDelay: "0.5s",
        }}
      >
        <CheckCircle2 style={{ width: 12, height: 12 }} />
        <span style={{ fontFamily: "var(--theme-font-mono)" }}>
          {liveCount + 1247} events processed
        </span>
        <span>•</span>
        <Clock style={{ width: 12, height: 12 }} />
        <span>Last scan: 2 min ago</span>
      </div>
    </div>
  );
}
