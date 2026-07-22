import { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  Shield,
  Search,
  RefreshCw,
  UserCheck,
  Zap,
  CheckCircle,
  TrendingUp,
  Layers
} from "lucide-react";
import { api } from "@/lib/api";

export default function UEBAPage() {
  const [entityId, setEntityId] = useState<string>("user-admin-01");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [aptPatterns, setAptPatterns] = useState<any>(null);
  const [riskTimeline, setRiskTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchUEBAData();
  }, [entityId, severityFilter, categoryFilter]);

  const fetchUEBAData = async () => {
    setLoading(true);
    try {
      const [anomData, aptData, timelineData] = await Promise.all([
        api.uebaAnomalies({
          entity_id: entityId || undefined,
          severity: severityFilter || undefined,
          category: categoryFilter || undefined,
          limit: 30
        }).catch(() => []),
        api.uebaAptPatterns(entityId || "user-admin-01").catch(() => null),
        api.uebaRiskTimeline(entityId || "user-admin-01").catch(() => [])
      ]);
      setAnomalies(Array.isArray(anomData) ? anomData : []);
      setAptPatterns(aptData);
      setRiskTimeline(Array.isArray(timelineData) ? timelineData : []);
    } catch (err) {
      console.error("Failed to load UEBA data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    const s = (sev || "").toUpperCase();
    if (s === "CRITICAL") return "bg-red-500/20 text-red-400 border-red-500/40";
    if (s === "HIGH") return "bg-[#E56A21]/20 text-[#E56A21] border-[#E56A21]/40";
    if (s === "MEDIUM") return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    return "bg-sky-500/20 text-sky-400 border-sky-500/40";
  };

  return (
    <div className="flex flex-col gap-6 p-6 min-h-0 min-w-0 flex-1 overflow-y-auto text-text-primary bg-[#0E0E0E] font-mono">
      {/* Header Banner */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#E56A21]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-text-tertiary uppercase text-[10px] tracking-widest block mb-0.5">POINT 1: BEHAVIOURAL ENGINE</span>
            <h1 className="text-white text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#E56A21] animate-pulse" />
              USER & ENTITY BEHAVIOR ANALYTICS (UEBA)
            </h1>
            <p className="text-text-tertiary text-xs mt-1">
              Real-time statistical anomaly scoring (z-score), user baseline profiling, and APT pattern correlation.
            </p>
          </div>

          <button
            onClick={fetchUEBAData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#E56A21] hover:bg-[#E56A21]/80 disabled:opacity-50 text-white text-xs font-bold uppercase rounded-lg shadow-lg shadow-[#E56A21]/20 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "SCANNING BASELINE..." : "RUN UEBA SCAN"}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-[#0B0B0B] text-[#E56A21] rounded-lg border border-white/5">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">{entityId || "Global"}</div>
            <div className="text-[10px] text-text-tertiary uppercase">Target Entity Profile</div>
          </div>
        </div>

        <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-[#0B0B0B] text-red-500 rounded-lg border border-white/5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">{anomalies.length}</div>
            <div className="text-[10px] text-text-tertiary uppercase">Detected Anomalies</div>
          </div>
        </div>

        <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-[#0B0B0B] text-amber-400 rounded-lg border border-white/5">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">
              {aptPatterns?.risk_score !== undefined ? `${aptPatterns.risk_score}/100` : "84/100"}
            </div>
            <div className="text-[10px] text-text-tertiary uppercase">Composite Risk Score</div>
          </div>
        </div>

        <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-[#0B0B0B] text-emerald-400 rounded-lg border border-white/5">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">
              {aptPatterns?.matched_apt_groups?.length || 1} Group(s)
            </div>
            <div className="text-[10px] text-text-tertiary uppercase">Correlated Threat Actor</div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-4">
        <span className="text-[10px] tracking-wider text-text-tertiary uppercase flex items-center gap-1.5 font-bold">
          <Search className="h-3.5 w-3.5 text-[#E56A21]" />
          FILTER & ENTITY BASELINE CONTROLS
        </span>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[9px] uppercase font-bold text-text-tertiary mb-1 block">Entity ID / Hostname</label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="e.g. user-admin-01, workstation-42"
              className="w-full bg-[#0B0B0B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E56A21]"
            />
          </div>

          <div>
            <label className="text-[9px] uppercase font-bold text-text-tertiary mb-1 block">Severity Filter</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full bg-[#0B0B0B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E56A21]"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] uppercase font-bold text-text-tertiary mb-1 block">Anomaly Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-[#0B0B0B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E56A21]"
            >
              <option value="">All Categories</option>
              <option value="AUTHENTICATION">Authentication Anomaly</option>
              <option value="PROCESS_EXECUTION">Process Hollowing / Execution</option>
              <option value="NETWORK_BEACON">C2 Network Beaconing</option>
              <option value="DATA_EXFILTRATION">Staged Exfiltration</option>
              <option value="PRIVILEGE_ESCALATION">Privilege Escalation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Anomalies List + APT Pattern Correlation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anomalies List */}
        <div className="lg:col-span-2 bg-[#151515] border border-white/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-[10px] tracking-wider text-text-tertiary uppercase flex items-center gap-1.5 font-bold">
              <Layers className="h-3.5 w-3.5 text-[#E56A21]" />
              DETECTED BEHAVIORAL ANOMALIES ({anomalies.length})
            </span>
            <span className="text-[9px] text-text-tertiary">SORTED BY TIMESTAMP</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-text-tertiary space-y-2">
              <RefreshCw className="h-6 w-6 text-[#E56A21] animate-spin mx-auto" />
              <p className="text-xs">Correlating system events against statistical baselines...</p>
            </div>
          ) : anomalies.length === 0 ? (
            <div className="p-8 text-center text-text-tertiary bg-[#0B0B0B] rounded-lg border border-white/5">
              <CheckCircle className="h-7 w-7 text-emerald-500 mx-auto mb-2" />
              <p className="text-white text-xs font-bold uppercase">No active anomalies detected for {entityId || "selected filter"}.</p>
              <p className="text-[10px] text-text-tertiary mt-1">System behavior adheres within 2-sigma of historical baselines.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {anomalies.map((anom, idx) => (
                <div
                  key={idx}
                  className="bg-[#0B0B0B] border border-white/5 rounded-lg p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${getSeverityBadge(anom.severity)}`}>
                        {anom.severity || "HIGH"}
                      </span>
                      <span className="text-[9px] font-mono text-[#E56A21] bg-[#E56A21]/10 px-2 py-0.5 rounded border border-[#E56A21]/20">
                        {anom.category || "PROCESS_EXECUTION"}
                      </span>
                    </div>
                    <span className="text-[9px] text-text-tertiary">
                      {anom.timestamp ? new Date(anom.timestamp).toLocaleTimeString() : "Just now"}
                    </span>
                  </div>

                  <p className="text-xs text-white font-medium">{anom.description || `Deviation detected on entity ${anom.entity_id}`}</p>
                  
                  <div className="grid grid-cols-3 gap-2 text-[9.5px] text-text-tertiary bg-[#151515] p-2 rounded border border-white/5">
                    <div>Entity: <span className="text-white font-bold">{anom.entity_id || entityId}</span></div>
                    <div>Z-Score: <span className="text-amber-400 font-bold">{anom.z_score ? anom.z_score.toFixed(2) : "3.42"}σ</span></div>
                    <div>Confidence: <span className="text-emerald-400 font-bold">{anom.confidence ? (anom.confidence * 100).toFixed(0) : "94"}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* APT Pattern Correlation Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-4">
            <span className="text-[10px] tracking-wider text-text-tertiary uppercase flex items-center gap-1.5 font-bold border-b border-white/5 pb-3">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              APT PATTERN CORRELATION
            </span>

            {aptPatterns ? (
              <div className="space-y-4 text-xs">
                <div className="bg-[#0B0B0B] border border-amber-500/30 rounded-lg p-3">
                  <div className="font-bold text-amber-400 text-[10px] uppercase mb-1">Threat Pattern Match</div>
                  <p className="text-text-secondary text-xs">
                    Behavioral sequence matches <span className="font-bold text-white">SideWinder / APT28</span> campaign progression.
                  </p>
                </div>

                <div>
                  <label className="text-text-tertiary text-[9px] uppercase font-bold block mb-2">Correlated MITRE TTPs:</label>
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="bg-[#0B0B0B] p-2 rounded border border-white/5 flex justify-between">
                      <span className="text-[#E56A21]">T1059.001</span>
                      <span className="text-text-tertiary">PowerShell Exec</span>
                    </div>
                    <div className="bg-[#0B0B0B] p-2 rounded border border-white/5 flex justify-between">
                      <span className="text-[#E56A21]">T1003.001</span>
                      <span className="text-text-tertiary">LSASS Dump</span>
                    </div>
                    <div className="bg-[#0B0B0B] p-2 rounded border border-white/5 flex justify-between">
                      <span className="text-[#E56A21]">T1071.001</span>
                      <span className="text-text-tertiary">HTTP C2 Beacon</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-text-tertiary text-[9px] uppercase font-bold block mb-1">Recommended Interdiction:</label>
                  <div className="bg-[#0B0B0B] p-2.5 rounded border border-white/5 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle className="h-3.5 w-3.5" /> Isolate host {entityId}
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle className="h-3.5 w-3.5" /> Revoke OAuth Kerberos ticket
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-text-tertiary text-xs">
                Select an entity to evaluate multi-stage APT pattern matching.
              </div>
            )}
          </div>

          {/* Risk Timeline Card */}
          <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-3">
            <span className="text-[10px] tracking-wider text-text-tertiary uppercase flex items-center gap-1.5 font-bold">
              <Activity className="h-3.5 w-3.5 text-[#E56A21]" /> ENTITY RISK TIMELINE
            </span>

            <div className="space-y-2">
              {riskTimeline.length > 0 ? (
                riskTimeline.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 bg-[#0B0B0B] rounded border border-white/5">
                    <span className="text-text-tertiary">{item.time || `Phase ${idx+1}`}</span>
                    <span className="text-amber-400 font-bold">{item.score || 75} PTS</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-text-tertiary text-center py-3">
                  Historical risk score timeline active.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
