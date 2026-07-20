"""Government Infrastructure Vulnerability Prioritisation Engine (Point 4).

Calculates Government Vulnerability Risk (GVR / G-CVSS) scores tailored for
Indian Critical Infrastructure (NIC, Power Grid, Defense, Railways, Telecom,
FinTech/NPCI, UIDAI, E-Gov, Healthcare).

Score Components:
  1. Base CVSS v3.1 / v4.0 Score (0.0 to 10.0)
  2. EPSS Score (Exploit Prediction Scoring System 0.0 to 1.0)
  3. CERT-In KEV Factor (Active exploitation status in Indian infrastructure)
  4. Government Sector Asset Criticality Tier (Tier 1 National Security -> Tier 4 Admin)
  5. Network Exposure Factor (Internet-Facing, DMZ, NICNET Internal, Air-Gapped)
"""

import datetime
import json
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

# ── Sector Criticality Definitions ──────────────────────────────────────────

SECTOR_CRITICALITY_TIERS = {
    "TIER_1_DEFENSE": {
        "name": "Defense & National Security",
        "multiplier": 2.0,
        "description": "Armed forces, Defense R&D (DRDO), Cabinet Secretariat, Strategic Forces Command",
    },
    "TIER_1_CRITICAL_INFRA": {
        "name": "Power, Telecom & Railways",
        "multiplier": 1.8,
        "description": "Power Grid / POSOCO, Indian Railways signalling, Telecom core backbones, Nuclear/Space",
    },
    "TIER_2_FINANCIAL_IDENTITY": {
        "name": "NPCI, UPI & UIDAI Gateway",
        "multiplier": 1.6,
        "description": "NPCI payment gateways, Aadhaar biometric authentication, RBI core banking infrastructure",
    },
    "TIER_2_HEALTHCARE_EMERGENCY": {
        "name": "Healthcare & Emergency Response",
        "multiplier": 1.4,
        "description": "AIIMS medical infrastructure, National Health Authority, Disaster Management (NDMA)",
    },
    "TIER_3_EGOV_CITIZEN": {
        "name": "E-Governance & Public Services",
        "multiplier": 1.2,
        "description": "Passport Seva, Income Tax portal, DigiLocker, State government citizen portals",
    },
    "TIER_4_INTERNAL_ADMIN": {
        "name": "Internal Administration",
        "multiplier": 1.0,
        "description": "Municipal administrative portals, internal departmental document repositories",
    },
}

NETWORK_EXPOSURE_FACTORS = {
    "INTERNET_FACING": 1.5,
    "DMZ": 1.2,
    "INTERNAL_NICNET": 1.0,
    "AIR_GAPPED": 0.4,
}

REMEDIATION_SLA_MAP = {
    "CRITICAL_EMERGENCY": {"sla_hours": 24, "min_gvr": 8.5},
    "HIGH_PRIORITY": {"sla_hours": 72, "min_gvr": 7.0},
    "MEDIUM_PRIORITY": {"sla_hours": 168, "min_gvr": 4.0},  # 7 days
    "LOW_PRIORITY": {"sla_hours": 720, "min_gvr": 0.0},     # 30 days
}

# Seed CERT-In Advisories for demonstration & fallback lookup
SEED_CERTIN_ADVISORIES = [
    {
        "ciad_id": "CIAD-2024-0001",
        "cve_id": "CVE-2021-44228",
        "title": "Critical RCE Vulnerability in Apache Log4j2 (Log4Shell)",
        "affected_product": "Apache Log4j 2.0-beta9 to 2.14.1",
        "cvss_base": 10.0,
        "epss_score": 0.97,
        "in_certin_kev": True,
        "certin_severity": "CRITICAL",
        "advisory_date": "2021-12-11",
        "mitigation": "Upgrade Apache Log4j2 to version 2.17.1 or later immediately. Set log4j2.formatMsgNoLookups=true as temporary mitigation.",
    },
    {
        "ciad_id": "CIAD-2024-0012",
        "cve_id": "CVE-2024-21887",
        "title": "Command Injection in Ivanti Connect Secure VPN",
        "affected_product": "Ivanti Connect Secure & Ivanti Policy Secure",
        "cvss_base": 9.1,
        "epss_score": 0.94,
        "in_certin_kev": True,
        "certin_severity": "CRITICAL",
        "advisory_date": "2024-01-15",
        "mitigation": "Apply vendor patch Ivanti 22.x or import mitigation.xml payload to block URI path abuse.",
    },
    {
        "ciad_id": "CIAD-2024-0025",
        "cve_id": "CVE-2023-34362",
        "title": "MOVEit Transfer SQL Injection Vulnerability",
        "affected_product": "Progress MOVEit Transfer",
        "cvss_base": 9.8,
        "epss_score": 0.96,
        "in_certin_kev": True,
        "certin_severity": "CRITICAL",
        "advisory_date": "2023-06-02",
        "mitigation": "Disable HTTP/HTTPS traffic to MOVEit Transfer, apply official security patch, inspect C:\\MOVEitTransfer\\wwwroot for web shells.",
    },
    {
        "ciad_id": "CIAD-2024-0040",
        "cve_id": "CVE-2017-11882",
        "title": "Microsoft Office Equation Editor Remote Code Execution",
        "affected_product": "Microsoft Office 2007/2010/2013/2016",
        "cvss_base": 7.8,
        "epss_score": 0.95,
        "in_certin_kev": True,
        "certin_severity": "HIGH",
        "advisory_date": "2017-11-14",
        "mitigation": "Apply KB4011276 patch or unregister EQNEDT32.EXE in Windows Registry.",
    },
    {
        "ciad_id": "CIAD-2024-0055",
        "cve_id": "CVE-2024-3400",
        "title": "Palo Alto Networks PAN-OS Command Injection Vulnerability",
        "affected_product": "PAN-OS 10.2, 11.0, 11.1 with GlobalProtect",
        "cvss_base": 10.0,
        "epss_score": 0.91,
        "in_certin_kev": True,
        "certin_severity": "CRITICAL",
        "advisory_date": "2024-04-12",
        "mitigation": "Enable Threat Prevention Signatures 95701 and upgrade to PAN-OS fixed versions.",
    },
]


class VulnerabilityPrioritizerEngine:
    """Engine for prioritizing vulnerabilities in Indian Government Critical Infrastructure."""

    def __init__(self, db_path: str):
        self._persistent_conn = None
        if db_path == ":memory:":
            self.db_path = db_path
            self._persistent_conn = sqlite3.connect(":memory:")
            self._persistent_conn.row_factory = sqlite3.Row
        else:
            self.db_path = str(Path(db_path))
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()
        self._seed_certin_data()

    def _conn(self) -> sqlite3.Connection:
        if self._persistent_conn is not None:
            return self._persistent_conn
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _close_conn(self, conn: sqlite3.Connection) -> None:
        if conn is not self._persistent_conn:
            conn.close()

    def _ensure_schema(self) -> None:
        conn = self._conn()
        try:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS gov_assets (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    department TEXT DEFAULT 'NIC',
                    sector_tier TEXT DEFAULT 'TIER_3_EGOV_CITIZEN',
                    network_exposure TEXT DEFAULT 'INTERNET_FACING',
                    ip_address TEXT DEFAULT '',
                    hostname TEXT DEFAULT '',
                    description TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS certin_advisories (
                    ciad_id TEXT PRIMARY KEY,
                    cve_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    affected_product TEXT DEFAULT '',
                    cvss_base REAL DEFAULT 0.0,
                    epss_score REAL DEFAULT 0.0,
                    in_certin_kev INTEGER DEFAULT 0,
                    certin_severity TEXT DEFAULT 'MEDIUM',
                    advisory_date TEXT DEFAULT '',
                    mitigation TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS cve_evaluations (
                    id TEXT PRIMARY KEY,
                    eval_timestamp TEXT NOT NULL,
                    cve_id TEXT NOT NULL,
                    asset_id TEXT NOT NULL,
                    cvss_base REAL DEFAULT 0.0,
                    epss_score REAL DEFAULT 0.0,
                    certin_kev_flag INTEGER DEFAULT 0,
                    gvr_score REAL DEFAULT 0.0,
                    priority_level TEXT DEFAULT 'MEDIUM_PRIORITY',
                    sla_hours INTEGER DEFAULT 168,
                    sla_deadline TEXT NOT NULL,
                    recommended_action TEXT DEFAULT '',
                    details_json TEXT DEFAULT '{}'
                );

                CREATE INDEX IF NOT EXISTS idx_cve_evals_asset ON cve_evaluations(asset_id);
                CREATE INDEX IF NOT EXISTS idx_cve_evals_cve ON cve_evaluations(cve_id);
            """)
            conn.commit()
        finally:
            self._close_conn(conn)

    def _seed_certin_data(self) -> None:
        conn = self._conn()
        try:
            for adv in SEED_CERTIN_ADVISORIES:
                conn.execute(
                    """INSERT OR REPLACE INTO certin_advisories
                       (ciad_id, cve_id, title, affected_product, cvss_base, epss_score, in_certin_kev, certin_severity, advisory_date, mitigation)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        adv["ciad_id"],
                        adv["cve_id"],
                        adv["title"],
                        adv["affected_product"],
                        adv["cvss_base"],
                        adv["epss_score"],
                        1 if adv["in_certin_kev"] else 0,
                        adv["certin_severity"],
                        adv["advisory_date"],
                        adv["mitigation"],
                    ),
                )
            conn.commit()
        finally:
            self._close_conn(conn)

    # ── Calculation Core ──────────────────────────────────────────────────

    def calculate_gvr_score(
        self,
        cvss_base: float,
        epss_score: float,
        in_certin_kev: bool,
        sector_tier: str,
        network_exposure: str,
    ) -> Dict[str, Any]:
        """Compute the Government Vulnerability Risk (GVR) score.

        Formula:
          Base_Weighted = cvss_base * (1.0 + epss_score * 0.5)
          KEV_Multiplier = 1.4 if in_certin_kev else 1.0
          Sector_Multiplier = SECTOR_CRITICALITY_TIERS[sector_tier]["multiplier"]
          Exposure_Multiplier = NETWORK_EXPOSURE_FACTORS[network_exposure]

          Raw_Score = (Base_Weighted * KEV_Multiplier * Exposure_Multiplier * Sector_Multiplier) / 3.0
          GVR_Score = min(10.0, max(0.0, round(Raw_Score, 2)))
        """
        tier_info = SECTOR_CRITICALITY_TIERS.get(
            sector_tier, SECTOR_CRITICALITY_TIERS["TIER_3_EGOV_CITIZEN"]
        )
        sector_mult = tier_info["multiplier"]
        exp_mult = NETWORK_EXPOSURE_FACTORS.get(network_exposure, 1.0)
        kev_mult = 1.4 if in_certin_kev else 1.0

        base_weighted = cvss_base * (1.0 + (epss_score * 0.5))
        raw_score = (base_weighted * kev_mult * exp_mult * sector_mult) / 3.0
        gvr_score = min(10.0, max(0.0, round(raw_score, 2)))

        # Determine Priority Level and SLA
        if gvr_score >= 8.5:
            priority = "CRITICAL_EMERGENCY"
            sla_hours = 24
        elif gvr_score >= 7.0:
            priority = "HIGH_PRIORITY"
            sla_hours = 72
        elif gvr_score >= 4.0:
            priority = "MEDIUM_PRIORITY"
            sla_hours = 168  # 7 days
        else:
            priority = "LOW_PRIORITY"
            sla_hours = 720  # 30 days

        return {
            "gvr_score": gvr_score,
            "priority_level": priority,
            "sla_hours": sla_hours,
            "components": {
                "cvss_base": cvss_base,
                "epss_score": epss_score,
                "in_certin_kev": in_certin_kev,
                "sector_tier": sector_tier,
                "sector_multiplier": sector_mult,
                "network_exposure": network_exposure,
                "exposure_multiplier": exp_mult,
                "kev_multiplier": kev_mult,
            },
        }

    # ── Asset Management ──────────────────────────────────────────────────

    def register_asset(
        self,
        name: str,
        department: str = "NIC",
        sector_tier: str = "TIER_3_EGOV_CITIZEN",
        network_exposure: str = "INTERNET_FACING",
        ip_address: str = "",
        hostname: str = "",
        description: str = "",
        asset_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Register or update a government infrastructure asset."""
        aid = asset_id or f"GOV-AST-{uuid.uuid4().hex[:8].upper()}"
        if sector_tier not in SECTOR_CRITICALITY_TIERS:
            sector_tier = "TIER_3_EGOV_CITIZEN"
        if network_exposure not in NETWORK_EXPOSURE_FACTORS:
            network_exposure = "INTERNET_FACING"

        conn = self._conn()
        try:
            conn.execute(
                """INSERT OR REPLACE INTO gov_assets
                   (id, name, department, sector_tier, network_exposure, ip_address, hostname, description)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (aid, name, department, sector_tier, network_exposure, ip_address, hostname, description),
            )
            conn.commit()
        finally:
            self._close_conn(conn)

        return {
            "asset_id": aid,
            "name": name,
            "department": department,
            "sector_tier": sector_tier,
            "network_exposure": network_exposure,
            "ip_address": ip_address,
            "hostname": hostname,
        }

    def get_assets(self) -> List[Dict[str, Any]]:
        conn = self._conn()
        try:
            rows = conn.execute("SELECT * FROM gov_assets ORDER BY name").fetchall()
            return [dict(r) for r in rows]
        finally:
            self._close_conn(conn)

    # ── Vulnerability Prioritization ──────────────────────────────────────

    def prioritize_cve(
        self,
        cve_id: str,
        asset_id: str,
        cvss_base: Optional[float] = None,
        epss_score: Optional[float] = None,
        override_in_certin_kev: Optional[bool] = None,
        recommended_action: str = "",
    ) -> Dict[str, Any]:
        """Evaluate and prioritize a CVE for a given government asset."""
        conn = self._conn()
        try:
            asset = conn.execute("SELECT * FROM gov_assets WHERE id = ?", (asset_id,)).fetchone()
            if not asset:
                return {"error": f"Asset '{asset_id}' not found in inventory."}

            asset_dict = dict(asset)

            # Check CERT-In advisory DB for default metrics if not supplied
            certin_adv = conn.execute(
                "SELECT * FROM certin_advisories WHERE cve_id = ?", (cve_id,)
            ).fetchone()

            if certin_adv:
                adv_dict = dict(certin_adv)
                cvss = cvss_base if cvss_base is not None else float(adv_dict["cvss_base"])
                epss = epss_score if epss_score is not None else float(adv_dict["epss_score"])
                kev = override_in_certin_kev if override_in_certin_kev is not None else bool(adv_dict["in_certin_kev"])
                action = recommended_action or adv_dict["mitigation"]
            else:
                cvss = cvss_base if cvss_base is not None else 7.5
                epss = epss_score if epss_score is not None else 0.50
                kev = override_in_certin_kev if override_in_certin_kev is not None else False
                action = recommended_action or f"Apply vendor patch for {cve_id} and restrict exposure."

            calc = self.calculate_gvr_score(
                cvss_base=cvss,
                epss_score=epss,
                in_certin_kev=kev,
                sector_tier=asset_dict["sector_tier"],
                network_exposure=asset_dict["network_exposure"],
            )

            now_dt = datetime.datetime.utcnow()
            now_iso = now_dt.isoformat() + "Z"
            deadline_iso = (now_dt + datetime.timedelta(hours=calc["sla_hours"])).isoformat() + "Z"
            eval_id = f"GVR-{uuid.uuid4().hex[:8].upper()}"

            conn.execute(
                """INSERT INTO cve_evaluations
                   (id, eval_timestamp, cve_id, asset_id, cvss_base, epss_score, certin_kev_flag, gvr_score, priority_level, sla_hours, sla_deadline, recommended_action, details_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    eval_id,
                    now_iso,
                    cve_id,
                    asset_id,
                    cvss,
                    epss,
                    1 if kev else 0,
                    calc["gvr_score"],
                    calc["priority_level"],
                    calc["sla_hours"],
                    deadline_iso,
                    action,
                    json.dumps(calc["components"]),
                ),
            )
            conn.commit()

            return {
                "evaluation_id": eval_id,
                "cve_id": cve_id,
                "asset": {
                    "id": asset_dict["id"],
                    "name": asset_dict["name"],
                    "department": asset_dict["department"],
                    "sector_tier": asset_dict["sector_tier"],
                    "network_exposure": asset_dict["network_exposure"],
                },
                "gvr_score": calc["gvr_score"],
                "priority_level": calc["priority_level"],
                "sla_hours": calc["sla_hours"],
                "sla_deadline": deadline_iso,
                "in_certin_kev": kev,
                "recommended_action": action,
                "components": calc["components"],
                "evaluated_at": now_iso,
            }
        finally:
            self._close_conn(conn)

    def scan_and_prioritize_batch(
        self, asset_id: str, cve_list: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Prioritize multiple CVEs for a single government asset and return ranked roadmap."""
        evaluations = []
        for item in cve_list:
            cve_id = item.get("cve_id", "")
            if not cve_id:
                continue
            res = self.prioritize_cve(
                cve_id=cve_id,
                asset_id=asset_id,
                cvss_base=item.get("cvss_base"),
                epss_score=item.get("epss_score"),
                override_in_certin_kev=item.get("in_certin_kev"),
                recommended_action=item.get("recommended_action", ""),
            )
            if "error" not in res:
                evaluations.append(res)

        # Sort by GVR score descending
        evaluations.sort(key=lambda x: x["gvr_score"], reverse=True)

        return {
            "asset_id": asset_id,
            "scanned_cves_count": len(evaluations),
            "critical_count": sum(1 for e in evaluations if e["priority_level"] == "CRITICAL_EMERGENCY"),
            "high_count": sum(1 for e in evaluations if e["priority_level"] == "HIGH_PRIORITY"),
            "medium_count": sum(1 for e in evaluations if e["priority_level"] == "MEDIUM_PRIORITY"),
            "low_count": sum(1 for e in evaluations if e["priority_level"] == "LOW_PRIORITY"),
            "evaluations": evaluations,
        }

    def get_certin_advisories(self, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Query stored CERT-In advisories."""
        conn = self._conn()
        try:
            if query:
                pattern = f"%{query}%"
                rows = conn.execute(
                    "SELECT * FROM certin_advisories WHERE cve_id LIKE ? OR title LIKE ? OR affected_product LIKE ?",
                    (pattern, pattern, pattern),
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM certin_advisories ORDER BY advisory_date DESC").fetchall()
            return [dict(r) for r in rows]
        finally:
            self._close_conn(conn)

    def get_remediation_roadmap(self, department: Optional[str] = None) -> Dict[str, Any]:
        """Generate a prioritized remediation roadmap across government assets."""
        conn = self._conn()
        try:
            query = """
                SELECT e.*, a.name as asset_name, a.department, a.sector_tier, a.network_exposure
                FROM cve_evaluations e
                JOIN gov_assets a ON e.asset_id = a.id
            """
            params = []
            if department:
                query += " WHERE a.department = ?"
                params.append(department)
            query += " ORDER BY e.gvr_score DESC"

            rows = conn.execute(query, params).fetchall()
            items = [dict(r) for r in rows]

            criticals = [i for i in items if i["priority_level"] == "CRITICAL_EMERGENCY"]
            highs = [i for i in items if i["priority_level"] == "HIGH_PRIORITY"]
            mediums = [i for i in items if i["priority_level"] == "MEDIUM_PRIORITY"]
            lows = [i for i in items if i["priority_level"] == "LOW_PRIORITY"]

            return {
                "total_vulnerabilities": len(items),
                "summary": {
                    "critical_24h_sla": len(criticals),
                    "high_72h_sla": len(highs),
                    "medium_7d_sla": len(mediums),
                    "low_30d_sla": len(lows),
                },
                "roadmap": {
                    "critical_emergency": criticals,
                    "high_priority": highs,
                    "medium_priority": mediums,
                    "low_priority": lows,
                },
            }
        finally:
            self._close_conn(conn)

    def get_summary(self) -> Dict[str, Any]:
        """Aggregate dashboard summary of vulnerability prioritization engine."""
        conn = self._conn()
        try:
            total_assets = conn.execute("SELECT COUNT(*) as c FROM gov_assets").fetchone()["c"]
            total_advisories = conn.execute("SELECT COUNT(*) as c FROM certin_advisories").fetchone()["c"]
            total_evals = conn.execute("SELECT COUNT(*) as c FROM cve_evaluations").fetchone()["c"]

            priority_counts = {
                r["priority_level"]: r["c"]
                for r in conn.execute(
                    "SELECT priority_level, COUNT(*) as c FROM cve_evaluations GROUP BY priority_level"
                ).fetchall()
            }

            return {
                "registered_assets": total_assets,
                "certin_advisories_indexed": total_advisories,
                "vulnerabilities_evaluated": total_evals,
                "priority_breakdown": priority_counts,
                "supported_sector_tiers": list(SECTOR_CRITICALITY_TIERS.keys()),
            }
        finally:
            self._close_conn(conn)
