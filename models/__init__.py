from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Threat Analyze-Text
class ThreatAnalyzeRequest(BaseModel):
    text: str
    has_image: bool = False
    ocr_text: str = ""

# Entity Correlate
class EntityCorrelateRequest(BaseModel):
    action: str  # "link" or "resolve"
    entity_a: Optional[str] = None
    entity_b: Optional[str] = None
    seed_entity: Optional[str] = None

# Chat Analyze
class ChatAnalyzeRequest(BaseModel):
    messages: Optional[List[str]] = None
    message: Optional[str] = None

# OCR Analyze
class OcrAnalyzeRequest(BaseModel):
    image_base64: Optional[str] = None

# Report Generate
class ReportGenerateRequest(BaseModel):
    title: str
    report_type: str
    executive_summary: Optional[str] = ""
    findings: Optional[List[Dict[str, Any]]] = []
    risk_summary: Optional[Dict[str, Any]] = {}
    recommendations: Optional[List[str]] = []

# Risk Score
class RiskScoreRequest(BaseModel):
    drug_probability: float
    automation_confidence: float
    platform_count: int
    network_size: int
    has_financials: bool

# Investigation Start
class InvestigationStartRequest(BaseModel):
    session_id: Optional[str] = None

# APT Attribution
class APTAttributionRequest(BaseModel):
    observed_ttps: List[str]
    observed_iocs: Optional[List[str]] = []
    target_sector: Optional[str] = None
    target_country: Optional[str] = None
    org_assets: Optional[List[Dict[str, Any]]] = []
    create_incident: bool = True

# Attack Prediction
class AttackPredictionRequest(BaseModel):
    observed_ttps: List[str]
    attributed_group_id: Optional[str] = None
    top_k: int = 10

# Threat Intel Search
class ThreatIntelSearchRequest(BaseModel):
    query: str
    search_type: str = "general"  # general, cve, apt_group, source_type
    top_k: int = 10

# SOAR Incident
class SOARIncidentRequest(BaseModel):
    alert_data: Dict[str, Any] = {}
    severity: str = "HIGH"
    attribution_result: Optional[Dict[str, Any]] = None
    title: Optional[str] = None
    mode: str = "simulate"  # simulate, approve, auto_execute

# SOAR Playbook Execution
class SOARPlaybookExecuteRequest(BaseModel):
    incident_id: str
    mode: str = "simulate"

# Attack Path
class AttackPathRequest(BaseModel):
    entry_point_id: str
    target_id: str
    max_depth: int = 8

# Blast Radius
class BlastRadiusRequest(BaseModel):
    compromised_asset_id: str

# UEBA Query
class UEBAQueryRequest(BaseModel):
    entity_id: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    since: Optional[str] = None
    limit: int = 50

# Incident Response Request Models (Point 3)
class IRAlertTriageRequest(BaseModel):
    alert_data: Dict[str, Any]
    source_type: str = "anomaly"

class IRContainmentRequest(BaseModel):
    incident_id: str
    mode: str = "simulate"
    action_ids: Optional[List[str]] = None
    target: str = ""

class IREscalationRequest(BaseModel):
    incident_id: str

class IRInvestigateRequest(BaseModel):
    incident_id: str
    notes: str = ""

class IRAutoRespondRequest(BaseModel):
    alert_data: Dict[str, Any]
    mode: str = "simulate"

class IRCloseRequest(BaseModel):
    incident_id: str
    resolution: str = "resolved"

# Vulnerability Prioritizer Request Models (Point 4)
class VulnRegisterAssetRequest(BaseModel):
    name: str
    department: str = "NIC"
    sector_tier: str = "TIER_3_EGOV_CITIZEN"
    network_exposure: str = "INTERNET_FACING"
    ip_address: str = ""
    hostname: str = ""
    description: str = ""
    asset_id: Optional[str] = None

class VulnPrioritizeCveRequest(BaseModel):
    cve_id: str
    asset_id: str
    cvss_base: Optional[float] = None
    epss_score: Optional[float] = None
    in_certin_kev: Optional[bool] = None
    recommended_action: str = ""

class VulnScanAssetRequest(BaseModel):
    asset_id: str
    cve_list: List[Dict[str, Any]]

# Digital Twin Request Models (Point 5)
class DTAddNodeRequest(BaseModel):
    name: str
    node_type: str = "HOST"
    department: str = "IT"
    ip_address: str = ""
    security_controls: Optional[List[str]] = None
    vulnerability_count: int = 0
    criticality_weight: float = 1.0
    node_id: Optional[str] = None

class DTAddEdgeRequest(BaseModel):
    source_id: str
    target_id: str
    protocol: str = "TCP"
    port: Optional[int] = None
    trust_level: float = 0.5
    edge_id: Optional[str] = None

class DTSimulateAttackRequest(BaseModel):
    scenario_key: str
    entry_node_id: str

class DTApplyDefenseRequest(BaseModel):
    sim_id: str
    defense_actions: List[Any]

