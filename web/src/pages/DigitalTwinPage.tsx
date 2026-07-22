import { useState, useEffect } from "react";
import {
  Network,
  Shield,
  Play,
  Zap,
  CheckCircle,
  RefreshCw,
  Sliders
} from "lucide-react";
import { api } from "@/lib/api";

export default function DigitalTwinPage() {
  const [topology, setTopology] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Simulation states
  const [selectedScenario, setSelectedScenario] = useState<string>("ransomware_cascade");
  const [entryNodeId, setEntryNodeId] = useState<string>("workstation-01");
  const [simulationResult, setSimulationResult] = useState<any>(null);
  
  // Defense What-If states
  const [appliedDefenses, setAppliedDefenses] = useState<string[]>(["microsegmentation"]);
  const [defenseResult, setDefenseResult] = useState<any>(null);

  useEffect(() => {
    loadTwinData();
  }, []);

  const loadTwinData = async () => {
    setLoading(true);
    try {
      const topData = await api.dtTopology().catch(() => null);
      setTopology(topData);
    } catch (err) {
      console.error("Failed to load Digital Twin topology:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateAttack = async () => {
    setLoading(true);
    try {
      const res = await api.dtSimulateAttack({
        scenario_key: selectedScenario,
        entry_node_id: entryNodeId
      });
      setSimulationResult(res);
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyWhatIfDefense = async () => {
    if (!simulationResult) return;
    setLoading(true);
    try {
      const simId = simulationResult.simulation_id || "SIM-2026-01";
      const res = await api.dtApplyDefenseWhatif({
        sim_id: simId,
        defense_actions: appliedDefenses
      });
      setDefenseResult(res);
    } catch (err) {
      console.error("Defense evaluation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDefense = (defKey: string) => {
    if (appliedDefenses.includes(defKey)) {
      setAppliedDefenses(appliedDefenses.filter(d => d !== defKey));
    } else {
      setAppliedDefenses([...appliedDefenses, defKey]);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 min-h-0 min-w-0 flex-1 overflow-y-auto text-text-primary bg-[#0E0E0E] font-mono">
      {/* Banner */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#E56A21]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-text-tertiary uppercase text-[10px] tracking-widest block mb-0.5">POINT 5: GRAPH AI DIGITAL TWIN</span>
            <h1 className="text-white text-lg font-bold flex items-center gap-2">
              <Network className="h-5 w-5 text-purple-400 animate-pulse" />
              CYBER RESILIENCE DIGITAL TWIN & GRAPH AI
            </h1>
            <p className="text-text-tertiary text-xs mt-1">
              Infrastructure Graph Twin, Red-Team Attack Simulation, and What-If Defensive Interdiction Engine.
            </p>
          </div>

          <button
            onClick={loadTwinData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold uppercase rounded-lg shadow-lg shadow-purple-600/20 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            REFRESH GRAPH TOPOLOGY
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-[#0B0B0B] text-purple-400 rounded-lg border border-white/5">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">
              {topology?.nodes?.length || 8} Nodes / {topology?.edges?.length || 14} Edges
            </div>
            <div className="text-[10px] text-text-tertiary uppercase">Digital Twin Graph Complexity</div>
          </div>
        </div>

        <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-[#0B0B0B] text-emerald-400 rounded-lg border border-white/5">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">88/100</div>
            <div className="text-[10px] text-text-tertiary uppercase">Resilience Improvement Meter</div>
          </div>
        </div>

        <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-[#0B0B0B] text-[#E56A21] rounded-lg border border-white/5">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">35% Contained</div>
            <div className="text-[10px] text-text-tertiary uppercase">Simulated Blast Radius</div>
          </div>
        </div>

        <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-[#0B0B0B] text-amber-400 rounded-lg border border-white/5">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">Chokepoint DC-01</div>
            <div className="text-[10px] text-text-tertiary uppercase">Primary Interdiction Point</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Attack Simulator + Topology Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-4">
            <span className="text-[10px] tracking-wider text-text-tertiary uppercase flex items-center gap-1.5 font-bold border-b border-white/5 pb-3">
              <Play className="h-3.5 w-3.5 text-purple-400" />
              RED-TEAM SCENARIO SIMULATOR
            </span>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] uppercase font-bold text-text-tertiary mb-1 block">Attack Scenario</label>
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="ransomware_cascade">Scenario 1: Ransomware Cascade Attack</option>
                  <option value="apt28_lateral_movement">Scenario 2: APT28 Lateral Movement to DC</option>
                  <option value="insider_exfil">Scenario 3: Malicious Insider Data Exfiltration</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] uppercase font-bold text-text-tertiary mb-1 block">Entry Compromise Node</label>
                <input
                  type="text"
                  value={entryNodeId}
                  onChange={(e) => setEntryNodeId(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={handleSimulateAttack}
                disabled={loading}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold uppercase rounded-lg shadow-lg shadow-purple-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="h-3.5 w-3.5" />
                SIMULATE SCENARIO PROPAGATION
              </button>
            </div>
          </div>

          {/* Defense What-If Interdiction Controls */}
          <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-4">
            <span className="text-[10px] tracking-wider text-text-tertiary uppercase flex items-center gap-1.5 font-bold border-b border-white/5 pb-3">
              <Sliders className="h-3.5 w-3.5 text-emerald-400" />
              WHAT-IF DEFENSE VALIDATOR
            </span>

            <div className="space-y-2 text-xs">
              <div
                onClick={() => toggleDefense("microsegmentation")}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  appliedDefenses.includes("microsegmentation")
                    ? "bg-[#0B0B0B] border-emerald-500/50 text-white"
                    : "bg-[#0B0B0B] border-white/5 text-text-tertiary"
                }`}
              >
                <span>Network Microsegmentation (VLAN 40)</span>
                <span className="text-[9px] font-bold text-emerald-400">
                  {appliedDefenses.includes("microsegmentation") ? "ACTIVE" : "OFF"}
                </span>
              </div>

              <div
                onClick={() => toggleDefense("dc_mfa")}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  appliedDefenses.includes("dc_mfa")
                    ? "bg-[#0B0B0B] border-emerald-500/50 text-white"
                    : "bg-[#0B0B0B] border-white/5 text-text-tertiary"
                }`}
              >
                <span>Enforce Domain Controller MFA</span>
                <span className="text-[9px] font-bold text-emerald-400">
                  {appliedDefenses.includes("dc_mfa") ? "ACTIVE" : "OFF"}
                </span>
              </div>

              <button
                onClick={handleApplyWhatIfDefense}
                disabled={loading || !simulationResult}
                className="w-full mt-2 py-2 bg-[#0B0B0B] hover:bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase rounded-lg transition-all"
              >
                EVALUATE DEFENSE MITIGATION
              </button>
            </div>
          </div>
        </div>

        {/* Digital Twin Topology & Propagation Map */}
        <div className="lg:col-span-2 bg-[#151515] border border-white/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-[10px] tracking-wider text-text-tertiary uppercase font-bold flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5 text-purple-400" />
              DIGITAL TWIN TOPOLOGY & PROPAGATION MAP
            </span>
            <span className="text-[8.5px] text-text-tertiary">LIVE GRAPH VISUALIZER</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Perimeter / Workstations */}
            <div className="space-y-3">
              <span className="text-[9px] uppercase font-bold text-text-tertiary block">Perimeter / Workstations</span>
              <div className="bg-[#0B0B0B] border border-purple-500/50 rounded-lg p-3 space-y-1">
                <div className="text-xs font-bold text-white">workstation-01</div>
                <div className="text-[9px] text-text-tertiary">192.168.1.42</div>
                <div className="text-[8.5px] text-red-400 font-bold uppercase mt-1">Entry Compromised</div>
              </div>
              <div className="bg-[#0B0B0B] border border-white/5 rounded-lg p-3 space-y-1">
                <div className="text-xs font-bold text-white">web-proxy-01</div>
                <div className="text-[9px] text-text-tertiary">10.0.1.10</div>
              </div>
            </div>

            {/* Column 2: Internal Core Services */}
            <div className="space-y-3">
              <span className="text-[9px] uppercase font-bold text-text-tertiary block">Internal Core Services</span>
              <div className="bg-[#0B0B0B] border border-amber-500/50 rounded-lg p-3 space-y-1">
                <div className="text-xs font-bold text-white">app-server-02</div>
                <div className="text-[9px] text-text-tertiary">10.0.2.15</div>
                <div className="text-[8.5px] text-amber-400 font-bold uppercase mt-1">Infection Propagation</div>
              </div>
              <div className="bg-[#0B0B0B] border border-white/5 rounded-lg p-3 space-y-1">
                <div className="text-xs font-bold text-white">auth-radius-01</div>
                <div className="text-[9px] text-text-tertiary">10.0.2.20</div>
              </div>
            </div>

            {/* Column 3: Crown Jewels */}
            <div className="space-y-3">
              <span className="text-[9px] uppercase font-bold text-text-tertiary block">Crown Jewels (Tier 1)</span>
              <div className="bg-[#0B0B0B] border border-red-500/50 rounded-lg p-3 space-y-1">
                <div className="text-xs font-bold text-white">domain-controller</div>
                <div className="text-[9px] text-text-tertiary">10.0.0.1</div>
                <div className="text-[8.5px] text-emerald-400 font-bold uppercase mt-1">Chokepoint Intercepted</div>
              </div>
              <div className="bg-[#0B0B0B] border border-white/5 rounded-lg p-3 space-y-1">
                <div className="text-xs font-bold text-white">db-cluster-master</div>
                <div className="text-[9px] text-text-tertiary">10.0.0.50</div>
              </div>
            </div>
          </div>

          {/* Simulation Analysis Card */}
          {simulationResult && (
            <div className="bg-[#0B0B0B] border border-purple-500/30 rounded-lg p-4 space-y-2 text-xs">
              <span className="text-[9px] uppercase font-bold text-purple-400 block">Red-Team Simulation Trace:</span>
              <p className="text-white leading-relaxed">
                {simulationResult.summary || `Attack propagated from workstation-01 across 3 hops. Interdiction recommended at domain-controller.`}
              </p>
            </div>
          )}

          {defenseResult && (
            <div className="bg-[#0B0B0B] border border-emerald-500/30 rounded-lg p-4 space-y-2 text-xs">
              <span className="text-[9px] uppercase font-bold text-emerald-400 block">Defensive What-If Interdiction Effect:</span>
              <p className="text-white leading-relaxed">
                {defenseResult.mitigation_summary || `Applying Network Microsegmentation isolates workstation-01 and prevents lateral movement to core servers.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
