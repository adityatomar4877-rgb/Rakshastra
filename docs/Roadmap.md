# ☤ RAKSHASTRA PRODUCT ROADMAP
> **Milestones, Development Phases, and Flagship Feature Pipeline**

This roadmap details the development milestones and active feature tracks of the Rakshastra platform, tracing progress from the core reasoning engines to enterprise desktop packaging and Algorand-backed micropayment scaling.

---

## 📅 1. Flagship Milestones Matrix

| Phase | Milestone | Focus Area | Features & Capabilities | Status | Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **Gemini-First Foundation** | Core Reasoning | Google Gemini 2.5/3.x integration, lazy client loading, and local offline heuristic fallbacks. | **Completed** | Q3 2025 |
| **Phase 2** | **x402 Pay-Per-Request** | Micropayments | Algorand Smart Contracts, Transaction ID validations, and API authorization hooks. | **Completed** | Q4 2025 |
| **Phase 3** | **Autonomous Orchestration** | Task Loop | Goal planning, evidence collection queues, and Explainable AI (XAI) reports. | **Completed** | Q1 2026 |
| **Phase 4** | **Enterprise Desktop Client** | Local Scanners | Windows `winget` distribution packaging, credential vault loading, and desktop OCR sidecars. | **In Progress** | Q2 2026 |
| **Phase 5** | **Decentralized Intel Mesh** | Scaling | Live blockchain indexing, peer-to-peer threat feed syncing, and collaborative agent swarms. | **Planned** | Q3 2026 |

---

## 🛠️ 2. Detailed Phase Breakdowns

### 🧠 Phase 1: Gemini-First Core (Completed)
* **API Optimization**: Developed a transport shim that converts OpenAI-style payloads to native Gemini `generateContent` REST schemas.
* **Context Budgeting**: Automated prompt compression at 50% threshold to preserve historical message contexts during complex investigations.
* **Safe Mode Fail-Open**: Built local heuristic template fallbacks enabling basic classification loops when API connections are unavailable.

### 💳 Phase 2: Pay-Per-Request Gateway (Completed)
* **Transaction Ingestion**: Enabled Authorization validation checking for raw transaction IDs sent over Algorand.
* **Smart Contract Integration**: Deployed standard Teal-based payment contracts for testnet transaction validation.
* **API Middleware**: Created custom validation middleware in FastAPI that blocks request execution unless a valid payment transaction is verified.

### ⚙️ Phase 3: Autonomous Orchestration (Completed)
* **Goal Parser**: Built a planning model that sets Primary Investigator Targets (Bot Operator, Money Mule, Fraud Network).
* **Task Queues**: Implemented a reactive task scheduler that injects new investigative tasks when the entity resolver finds matches.
* **Explainable AI (XAI)**: Programmed the generator to produce structured reasoning paths, detailing confidence levels and counter-evidence.

### 💻 Phase 4: Enterprise Desktop Client (In Progress)
* **Winget Deployment**: Designed the silent CLI installer manifest for distribution via Windows package manager.
* **Credential Vaulting**: Integrating Windows DPAPI (Data Protection API) for encrypted local storage of Google API keys.
* **On-Premise Ingestion**: Writing background file/registry scanners that feed indicators back to the central FastAPI orchestrator.
