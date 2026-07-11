# ☤ RAKSHASTRA REST API
> **Integration Gateway and Pay-Per-Request (x402) Threat Intel Endpoints**

Rakshastra exposes a high-performance REST API under `/api/v1/` for threat analysis, alias correlation, evidence mapping, and timeline generation. External Security Operations Centers (SOCs) can query these endpoints via standard API keys or by utilizing the **x402** Algorand micro-payment architecture.

---

## 🚦 Endpoint Reference Directory

| Module | Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **Threat Core** | `POST` | [`/api/v1/threat/analyze-text`](#/api/v1/threat/analyze-text) | Run text against threat intelligence packages. | Yes / x402 |
| **Correlation** | `POST` | [`/api/v1/entity/correlate`](#/api/v1/entity/correlate) | Check identifier reuse against historical cases. | Yes / x402 |
| **Reporting** | `POST` | [`/api/v1/report/generate`](#/api/v1/report/generate) | Compile an Explainable AI (XAI) markdown report. | Yes |

---

## ⚡ 1. Threat Core Analysis

### <kbd>POST</kbd> `/api/v1/threat/analyze-text`
Runs raw text payloads against modular active threat intelligence packs (financial scams, crypto fraud, credential phishing, etc.).

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <API_KEY>  # Or X-Algorand-Tx: <TX_ID> for x402 billing
```

#### Request Parameters
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `text` | `string` | **Yes** | The raw text dump (chat export, email body, OCR output) to analyze. |

#### Sample Request Body
```json
{
  "text": "URGENT: Your account is suspended. Send 0.05 BTC to wallet address: bc1qxy2kg3ut6mr883usxsstch74pr3s7jcd74"
}
```

#### Sample Response (`200 OK`)
```json
{
  "risk_score": 0.85,
  "detected_threat": "Crypto Scam & Phishing",
  "reasoning": "Matched active crypto wallet address pattern and urgent suspension language.",
  "matched_indicators": [
    "bc1qxy2kg3ut6mr883usxsstch74pr3s7jcd74"
  ],
  "suggested_action": "Block incoming email/message, flag wallet, and add indicators to corporate DNS firewall blocks.",
  "confidence": 0.95
}
```

---

## 🔗 2. Entity Resolution & Correlation

### <kbd>POST</kbd> `/api/v1/entity/correlate`
Scans extracted indicators against historical case databases to find indicator reuse (cross-platform handles, wallets, URLs).

#### Request Parameters
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `session_id` | `string` | **Yes** | The active investigation session identifier. |
| `source_platform` | `string` | No | Ingestion source (e.g. `Telegram`, `WhatsApp`). |
| `text` | `string` | **Yes** | Raw content containing handles, phone numbers, or invite links. |

#### Sample Request Body
```json
{
  "session_id": "session_001",
  "source_platform": "Telegram",
  "text": "Administrator handle: @DirectMeds, primary support phone: +919893212345"
}
```

#### Sample Response (`200 OK`)
```json
{
  "matched_evidence": [
    {
      "matching_session_id": "session_099",
      "confidence": 0.95,
      "matched_indicators": {
        "phone": ["+919893212345"]
      }
    }
  ],
  "confidence": 0.95,
  "reasoning": [
    "Reused phone indicator detected across active investigations: ['+919893212345']"
  ],
  "suggested_merge": {
    "session_a": "session_001",
    "session_b": "session_099",
    "confidence": 0.95
  },
  "risk_increase": 0.475
}
```

---

## 📝 3. Explainable AI Report Generation

### <kbd>POST</kbd> `/api/v1/report/generate`
Synthesizes structured outputs from analysis and correlation runs into a high-fidelity Markdown report and executive summary.

#### Request Parameters
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `session_id` | `string` | **Yes** | Active session ID to bundle. |
| `threat_output` | `object` | **Yes** | Raw JSON output dictionary from the `/threat/analyze-text` step. |
| `entity_output` | `object` | No | Extracted entity resolution dictionary. |
| `graph_output` | `object` | No | Extracted graph node/link relationship mapping dictionary. |
| `correlation_output` | `object` | No | Extracted cross-platform correlation dictionary. |

#### Sample Response (`200 OK`)
```json
{
  "threat_summary": {
    "what_was_found": "Identified cross-channel infrastructure reuse linked to MDMA supply network.",
    "why_it_matters": "Active phishing and scam deployment with overlapping Telegram/WhatsApp infrastructure.",
    "confidence": "85%",
    "overall_threat_level": "CRITICAL"
  },
  "reasoning_chain": [
    "Step 1: Text normalized; extracted phone number (+919893212345).",
    "Step 2: Queried history; found identical phone number in session_099.",
    "Step 3: Correlated handles; verified alias linkage between @DirectMeds and target node.",
    "Conclusion: High confidence link established to a known threat group."
  ],
  "markdown_report": "# EXPLAINABLE AI REPORT\n\n## Summary...\n"
}
```
