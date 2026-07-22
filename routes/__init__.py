from fastapi import APIRouter
from models import (
    ThreatAnalyzeRequest,
    EntityCorrelateRequest,
    ChatAnalyzeRequest,
    OcrAnalyzeRequest,
    ReportGenerateRequest,
    RiskScoreRequest,
    InvestigationStartRequest,
    APTAttributionRequest,
    AttackPredictionRequest,
    ThreatIntelSearchRequest,
    SOARIncidentRequest,
    SOARPlaybookExecuteRequest,
    AttackPathRequest,
    BlastRadiusRequest,
    UEBAQueryRequest,
    IRAlertTriageRequest,
    IRContainmentRequest,
    IREscalationRequest,
    IRInvestigateRequest,
    IRAutoRespondRequest,
    IRCloseRequest,
    VulnRegisterAssetRequest,
    VulnPrioritizeCveRequest,
    VulnScanAssetRequest,
    DTAddNodeRequest,
    DTAddEdgeRequest,
    DTSimulateAttackRequest,
    DTApplyDefenseRequest
)
from controllers import (
    ThreatController,
    EntityController,
    ChatController,
    OcrController,
    ReportController,
    RiskController,
    InvestigationController,
    APTController,
    ThreatIntelController,
    SOARController,
    AttackGraphController,
    UEBAController,
    IncidentResponseController,
    VulnerabilityController,
    DigitalTwinController
)
from typing import Optional


router = APIRouter()

@router.post("/threat/analyze-text")
def analyze_text(request: ThreatAnalyzeRequest):
    return ThreatController.analyze_text(request)

@router.post("/entity/correlate")
def correlate(request: EntityCorrelateRequest):
    return EntityController.correlate(request)

@router.post("/chat/analyze")
def analyze_chat(request: ChatAnalyzeRequest):
    return ChatController.analyze(request)

@router.post("/ocr/analyze")
def ocr_analyze(request: OcrAnalyzeRequest):
    return OcrController.analyze(request)

@router.post("/report/generate")
def generate_report(request: ReportGenerateRequest):
    return ReportController.generate(request)

@router.post("/risk/score")
def risk_score(request: RiskScoreRequest):
    return RiskController.score(request)

@router.post("/investigation/start")
def start_investigation(request: InvestigationStartRequest):
    return InvestigationController.start(request)

@router.get("/status")
def get_status():
    # Simple status endpoint returning nominal service status
    return {
        "status": "NOMINAL",
        "api_version": "v1",
        "service": "Rakshastra API"
    }

# ── APT Endpoints ────────────────────────────────────────────────────────

@router.post("/apt/attribute")
def apt_attribute(request: APTAttributionRequest):
    return APTController.attribute(request)

@router.post("/apt/predict")
def apt_predict(request: AttackPredictionRequest):
    return APTController.predict(request)

@router.post("/apt/full-analysis")
def apt_full_analysis(request: APTAttributionRequest):
    return APTController.full_analysis(request)

@router.get("/apt/techniques")
def apt_techniques(tactic_id: Optional[str] = None):
    return APTController.get_techniques(tactic_id)

@router.get("/apt/groups")
def apt_groups():
    return APTController.get_groups()

@router.get("/apt/tactics")
def apt_tactics():
    return APTController.get_tactics()

@router.get("/apt/group/{group_id}")
def apt_group_profile(group_id: str):
    return APTController.get_group_profile(group_id)

# ── Threat Intelligence RAG Endpoints ────────────────────────────────────

@router.post("/threat-intel/search")
def threat_intel_search(request: ThreatIntelSearchRequest):
    return ThreatIntelController.search(request)

# ── SOAR Endpoints ───────────────────────────────────────────────────────

@router.post("/soar/create-incident")
def soar_create_incident(request: SOARIncidentRequest):
    return SOARController.create_incident(request)

@router.post("/soar/execute-playbook")
def soar_execute_playbook(request: SOARPlaybookExecuteRequest):
    return SOARController.execute_playbook(request)

@router.get("/soar/playbooks")
def soar_playbooks():
    return SOARController.get_playbooks()

@router.get("/soar/incidents")
def soar_incidents(status: Optional[str] = None, limit: int = 50):
    return SOARController.get_incidents(status, limit)

@router.get("/soar/incident/{incident_id}")
def soar_incident(incident_id: str):
    return SOARController.get_incident(incident_id)

@router.get("/soar/incident/{incident_id}/actions")
def soar_incident_actions(incident_id: str):
    return SOARController.get_actions(incident_id)

# ── Attack Graph Endpoints ───────────────────────────────────────────────

@router.post("/attack-graph/paths")
def attack_graph_paths(request: AttackPathRequest):
    return AttackGraphController.compute_paths(request)

@router.post("/attack-graph/blast-radius")
def attack_graph_blast_radius(request: BlastRadiusRequest):
    return AttackGraphController.simulate_blast_radius(request)

@router.get("/attack-graph/chokepoints")
def attack_graph_chokepoints():
    return AttackGraphController.get_chokepoints()

# ── UEBA Endpoints ───────────────────────────────────────────────────────

@router.post("/ueba/anomalies")
def ueba_anomalies(request: UEBAQueryRequest):
    return UEBAController.get_anomalies(request)

@router.get("/ueba/apt-patterns/{entity_id}")
def ueba_apt_patterns(entity_id: str):
    return UEBAController.get_apt_patterns(entity_id)

@router.get("/ueba/risk-timeline/{entity_id}")
def ueba_risk_timeline(entity_id: str):
    return UEBAController.get_risk_timeline(entity_id)

# ── Incident Response Endpoints (Point 3) ───────────────────────────────

@router.post("/ir/triage")
def ir_triage(request: IRAlertTriageRequest):
    return IncidentResponseController.triage(request)

@router.post("/ir/containment")
def ir_containment(request: IRContainmentRequest):
    return IncidentResponseController.containment(request)

@router.post("/ir/escalate")
def ir_escalate(request: IREscalationRequest):
    return IncidentResponseController.escalate(request)

@router.post("/ir/investigate")
def ir_investigate(request: IRInvestigateRequest):
    return IncidentResponseController.investigate(request)

@router.post("/ir/auto-respond")
def ir_auto_respond(request: IRAutoRespondRequest):
    return IncidentResponseController.auto_respond(request)

@router.post("/ir/close")
def ir_close(request: IRCloseRequest):
    return IncidentResponseController.close(request)

@router.get("/ir/incidents")
def ir_incidents(phase: Optional[str] = None, limit: int = 50):
    return IncidentResponseController.get_incidents(phase, limit)

@router.get("/ir/incident/{incident_id}")
def ir_incident(incident_id: str):
    return IncidentResponseController.get_incident(incident_id)

@router.get("/ir/summary")
def ir_summary():
    return IncidentResponseController.get_summary()

# ── Vulnerability Prioritizer Endpoints (Point 4) ───────────────────────

@router.post("/vulnerability/register-asset")
def vuln_register_asset(request: VulnRegisterAssetRequest):
    return VulnerabilityController.register_asset(request)

@router.post("/vulnerability/prioritize-cve")
def vuln_prioritize_cve(request: VulnPrioritizeCveRequest):
    return VulnerabilityController.prioritize_cve(request)

@router.post("/vulnerability/scan-asset")
def vuln_scan_asset(request: VulnScanAssetRequest):
    return VulnerabilityController.scan_asset(request)

@router.get("/vulnerability/certin-advisories")
def vuln_certin_advisories(query: Optional[str] = None):
    return VulnerabilityController.get_certin_advisories(query)

@router.get("/vulnerability/remediation-roadmap")
def vuln_remediation_roadmap(department: Optional[str] = None):
    return VulnerabilityController.get_remediation_roadmap(department)

@router.get("/vulnerability/summary")
def vuln_summary():
    return VulnerabilityController.get_summary()

# ── Digital Twin Endpoints (Point 5) ────────────────────────────────────

@router.post("/digital-twin/add-node")
def dt_add_node(request: DTAddNodeRequest):
    return DigitalTwinController.add_node(request)

@router.post("/digital-twin/add-edge")
def dt_add_edge(request: DTAddEdgeRequest):
    return DigitalTwinController.add_edge(request)

@router.get("/digital-twin/topology")
def dt_topology():
    return DigitalTwinController.get_topology()

@router.post("/digital-twin/simulate-attack")
def dt_simulate_attack(request: DTSimulateAttackRequest):
    return DigitalTwinController.simulate_attack(request)

@router.post("/digital-twin/apply-defense-whatif")
def dt_apply_defense_whatif(request: DTApplyDefenseRequest):
    return DigitalTwinController.apply_defense_whatif(request)

@router.get("/digital-twin/summary")
def dt_summary():
    return DigitalTwinController.get_summary()


