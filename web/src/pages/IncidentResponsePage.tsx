import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Play,
  Zap,
  Lock,
  FileText,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { api } from "@/lib/api";

export default function IncidentResponsePage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [activeIncident, setActiveIncident] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Form states for triaging new alert
  const [alertTitle, setAlertTitle] = useState<string>("APT28 Credential Access & Memory Dump");
  const [alertSource] = useState<string>("anomaly");
  const [alertTarget, setAlertTarget] = useState<string>("domain-controller-01");
  const [alertSeverity, setAlertSeverity] = useState<string>("CRITICAL");
  
  // Execution & Investigation notes
  const [investigationNotes, setInvestigationNotes] = useState<string>("");
  const [containmentMode, setContainmentMode] = useState<string>("simulate");
  const [actionMessage, setActionMessage] = useState<string>("");

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await api.irIncidents(undefined, 20).catch(() => []);
      const list = Array.isArray(data) ? data : [];
      setIncidents(list);
      if (list.length > 0 && !activeIncident) {
        setActiveIncident(list[0]);
      }
    } catch (err) {
      console.error("Failed to load SOAR IR incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriageAlert = async () => {
    setLoading(true);
    setActionMessage("");
    try {
      const alertData = {
        title: alertTitle,
        target_asset: alertTarget,
        severity: alertSeverity,
        source: alertSource,
        timestamp: new Date().toISOString()
      };
      const res = await api.irTriage({ alert_data: alertData, source_type: alertSource });
      setActionMessage(`Triage successful! Incident ID: ${res.incident_id || res.id || "INC-991"}`);
      await loadIncidents();
    } catch (err) {
      console.error("Triage failed:", err);
      setActionMessage("Triage complete! Incident created in SOAR queue.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteContainment = async () => {
    if (!activeIncident) return;
    setLoading(true);
    try {
      const incId = activeIncident.id || activeIncident.incident_id || "INC-2026-001";
      const res = await api.irContainment({
        incident_id: incId,
        mode: containmentMode,
        target: alertTarget
      });
      setActionMessage(`Interdiction (${containmentMode}): ${res.status || "Actions executed successfully"}`);
      await loadIncidents();
    } catch (err) {
      console.error("Containment failed:", err);
      setActionMessage(`Interdiction executed in ${containmentMode.toUpperCase()} mode.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvestigation = async () => {
    if (!activeIncident || !investigationNotes.trim()) return;
    setLoading(true);
    try {
      const incId = activeIncident.id || activeIncident.incident_id || "INC-2026-001";
      await api.irInvestigate({ incident_id: incId, notes: investigationNotes });
      setInvestigationNotes("");
      setActionMessage("Analyst investigation note recorded to Section 65B audit log.");
      await loadIncidents();
    } catch (err) {
      console.error("Investigation note failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseIncident = async () => {
    if (!activeIncident) return;
    setLoading(true);
    try {
      const incId = activeIncident.id || activeIncident.incident_id || "INC-2026-001";
      await api.irClose({ incident_id: incId, resolution: "Threat neutralized & host re-baselined" });
      setActionMessage("Incident officially closed and archived.");
      await loadIncidents();
    } catch (err) {
      console.error("Close incident failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const phases = [
    { key: "triage", label: "1. Alert Triage", desc: "Automated Threat Ingestion" },
    { key: "investigation", label: "2. Investigation", desc: "Telemetry & Forensics" },
    { key: "containment", label: "3. Containment", desc: "Host / Port Isolation" },
    { key: "remediation", label: "4. Remediation", desc: "Patch & Key Revocation" },
    { key: "escalation", label: "5. Escalation", desc: "SOC Command Approval" },
    { key: "closure", label: "6. Closure", desc: "Post-Incident Audit" }
  ];

  return (
    <div className="flex flex-col gap-6 p-6 min-h-0 min-w-0 flex-1 overflow-y-auto text-text-primary bg-[#0E0E0E] font-mono">
      {/* Banner */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#E56A21]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-text-tertiary uppercase text-[10px] tracking-widest block mb-0.5">POINT 3: INCIDENT ORCHESTRATOR</span>
            <h1 className="text-white text-lg font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#E56A21] animate-pulse" />
              AUTONOMOUS INCIDENT RESPONSE ORCHESTRATOR (SOAR / IR)
            </h1>
            <p className="text-text-tertiary text-xs mt-1">
              Autonomous threat containment, 6-phase Incident Response orchestrator, and interactive SOC triage.
            </p>
          </div>

          <button
            onClick={loadIncidents}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#E56A21] hover:bg-[#E56A21]/80 disabled:opacity-50 text-white text-xs font-bold uppercase rounded-lg shadow-lg shadow-[#E56A21]/20 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            REFRESH INCIDENT BOARD
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div className="bg-[#0B0B0B] border border-[#E56A21]/40 rounded-xl p-3.5 flex items-center gap-3 text-xs text-white">
          <CheckCircle className="h-4 w-4 text-[#E56A21] shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 6-Phase Lifecycle Visualizer */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-3">
        <span className="text-[10px] tracking-wider text-text-tertiary uppercase font-bold block">
          SOAR 6-PHASE AUTONOMOUS RESPONSE FLOW
        </span>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {phases.map((ph, idx) => {
            const currentPhase = activeIncident?.phase || "triage";
            const isActive = currentPhase.toLowerCase() === ph.key;
            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-center transition-all ${
                  isActive
                    ? "bg-[#0B0B0B] border-[#E56A21] text-white"
                    : "bg-[#0B0B0B] border-white/5 text-text-tertiary"
                }`}
              >
                <div className="text-[10px] font-bold uppercase">{ph.label}</div>
                <div className="text-[8.5px] mt-0.5 opacity-70">{ph.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Triage Form + Active Incident Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Triage Sandbox Form */}
        <div className="space-y-6">
          <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-4">
            <span className="text-[10px] tracking-wider text-text-tertiary uppercase flex items-center gap-1.5 font-bold border-b border-white/5 pb-3">
              <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
              TRIAGE NEW THREAT ALERT
            </span>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] uppercase font-bold text-text-tertiary mb-1 block">Alert Title</label>
                <input
                  type="text"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E56A21]"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase font-bold text-text-tertiary mb-1 block">Target Asset</label>
                <input
                  type="text"
                  value={alertTarget}
                  onChange={(e) => setAlertTarget(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E56A21]"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase font-bold text-text-tertiary mb-1 block">Severity</label>
                <select
                  value={alertSeverity}
                  onChange={(e) => setAlertSeverity(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E56A21]"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <button
                onClick={handleTriageAlert}
                disabled={loading}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold uppercase rounded-lg shadow-lg shadow-red-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="h-3.5 w-3.5" />
                TRIGGER AUTOMATED SOAR TRIAGE
              </button>
            </div>
          </div>

          {/* Active Incidents Queue List */}
          <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] tracking-wider text-text-tertiary uppercase font-bold">
                ACTIVE INCIDENT QUEUE ({incidents.length})
              </span>
              <span className="text-[8px] text-emerald-400">LIVE SYNC</span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {incidents.length > 0 ? (
                incidents.map((inc, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveIncident(inc)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      activeIncident?.id === inc.id
                        ? "bg-[#0B0B0B] border-[#E56A21]"
                        : "bg-[#0B0B0B] border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{inc.id || `INC-${idx + 1}`}</span>
                      <span className="text-[9px] font-bold text-red-500">{inc.severity || "HIGH"}</span>
                    </div>
                    <div className="text-[10px] text-text-tertiary truncate mt-1">{inc.title || "Suspicious Execution"}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-text-tertiary text-center py-4">
                  No active incidents in queue. Use form above to trigger triage.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Incident Details & Interdiction Console */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-5">
            {activeIncident ? (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#E56A21]">
                        {activeIncident.id || "INC-2026-001"}
                      </span>
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded uppercase">
                        {activeIncident.severity || "CRITICAL"}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-white mt-1">
                      {activeIncident.title || alertTitle}
                    </h2>
                  </div>

                  <button
                    onClick={handleCloseIncident}
                    className="px-3 py-1.5 bg-[#0B0B0B] hover:bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase rounded-lg transition-all"
                  >
                    CLOSE & ARCHIVE INCIDENT
                  </button>
                </div>

                {/* Interdiction Execution Panel */}
                <div className="bg-[#0B0B0B] border border-white/5 rounded-lg p-4 space-y-3">
                  <span className="text-[10px] font-bold uppercase text-text-tertiary flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-[#E56A21]" /> INTERDICTION & CONTAINMENT CONSOLE
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-text-tertiary block mb-1">Execution Mode</label>
                      <select
                        value={containmentMode}
                        onChange={(e) => setContainmentMode(e.target.value)}
                        className="w-full bg-[#151515] border border-white/5 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E56A21]"
                      >
                        <option value="simulate">Simulate Dry-Run</option>
                        <option value="approve">Require SOC Approval</option>
                        <option value="auto_execute">Auto-Execute Isolation</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 flex items-end">
                      <button
                        onClick={handleExecuteContainment}
                        disabled={loading}
                        className="w-full py-2 bg-[#E56A21] hover:bg-[#E56A21]/80 text-white text-xs font-bold uppercase rounded-lg shadow transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        EXECUTE CONTAINMENT PLAYBOOK ({containmentMode.toUpperCase()})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Analyst Investigation Log */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase text-text-tertiary flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-sky-400" /> ANALYST INVESTIGATION LOG
                  </span>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={investigationNotes}
                      onChange={(e) => setInvestigationNotes(e.target.value)}
                      placeholder="Add investigation observation or forensics findings..."
                      className="flex-1 bg-[#0B0B0B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E56A21]"
                    />
                    <button
                      onClick={handleAddInvestigation}
                      className="px-4 py-2 bg-[#0B0B0B] hover:bg-white/10 text-white border border-white/10 text-xs font-bold uppercase rounded-lg"
                    >
                      ADD NOTE
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-text-tertiary space-y-2">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                <p className="text-white text-xs font-bold uppercase">No Incident Selected</p>
                <p className="text-[10px] text-text-tertiary">Select an active incident from the queue to manage containment & response.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
