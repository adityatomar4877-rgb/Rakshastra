# RAKSHASTRA: NEXT SPRINT PLAN
> **Prioritized Development Roadmap & Implementation Tasks**

This sprint plan lists remaining work to move Rakshastra from a fully functional prototype/hackathon platform to a production-grade enterprise deployment.

---

## 🔴 1. HIGH PRIORITY TASKS

### Task H1: Frontend Wallet Connect Integration
* **Why**: Users need to pay endpoint query fees directly from the React/Vite dashboard without manual transaction tracking.
* **Complexity**: Medium
* **Time Estimate**: 3 Days
* **Dependencies**: Web UI Dashboard, Algorand Indexer Node
* **Affected Files**:
  - `web/package.json` (Add Pera Wallet Connect SDK / WalletConnect)
  - `web/src/components/WalletConnect.tsx` (New Component)
  - `web/src/pages/DocsPage.tsx` (Add purchase credit screen)
* **Expected Commits**:
  - `feat(web): add wallet connect button and transaction trigger component`
* **Expected Tests**:
  - Mock connection states, mock payment transactions trigger, and verify `X-Algorand-Tx` header presence.

### Task H2: Production Algorand Indexer Switch
* **Why**: The payment validation logic needs to verify live transactions using an active Algorand node / Indexer instead of a simulated verify block.
* **Complexity**: Medium
* **Time Estimate**: 2 Days
* **Dependencies**: FastAPI Backend, `algosdk` Python package
* **Affected Files**:
  - `rakshastra_cli/web_server.py` (Update x402 validation middleware)
  - `config/x402.yaml` (Production keys and wallet configuration)
* **Expected Commits**:
  - `feat(x402): integrate live Algorand Indexer transaction validation check`
* **Expected Tests**:
  - Test validation with valid Testnet TX IDs; verify invalid TX ID rejection.

---

## 🟡 2. MEDIUM PRIORITY TASKS

### Task M1: Standardize Credentials Store (DPAPI Integration)
* **Why**: Storing the Google Gemini API key in plain text `.env` introduces security risks on Windows client systems.
* **Complexity**: Medium
* **Time Estimate**: 2 Days
* **Dependencies**: Windows Companion App, Python `win32credential`
* **Affected Files**:
  - `agent/agent_init.py` (Update credentials lookup order)
  - `apps/desktop/electron/installer.ts` (Registry / storage settings)
* **Expected Commits**:
  - `security(windows): store Google API keys in Windows Credential Manager`
* **Expected Tests**:
  - Verify key lookup succeeds when retrieval is routed through Windows Credential Vault.

### Task M2: Custom MCP Server Ingestion
* **Why**: Allow users to hook their own external Model Context Protocol (MCP) servers (like custom database search tools or vulnerability scanners) directly to the autonomous orchestrator.
* **Complexity**: High
* **Time Estimate**: 4 Days
* **Dependencies**: MCP Python Client
* **Affected Files**:
  - `rakshastra_core/intelligence/autonomous_orchestrator.py` (Task discovery list)
  - `tools/mcp_tool.py` (Add configuration parser)
* **Expected Commits**:
  - `feat(mcp): support dynamic MCP server discovery in task planner`
* **Expected Tests**:
  - Launch mock MCP server; verify that its exposed tools are parsed and executed by the autonomous agent.

---

## 🟢 3. LOW PRIORITY TASKS

### Task L1: Transaction Ledger Public Leaderboard
* **Why**: Create a public stats page in the web dashboard showcasing platform queries and validated transactions.
* **Complexity**: Low
* **Time Estimate**: 1 Day
* **Dependencies**: SQLite Storage
* **Affected Files**:
  - `web/src/pages/SystemPage.tsx` (Add leaderboard display component)
* **Expected Commits**:
  - `feat(web): build public transaction leaderboard metrics page`
* **Expected Tests**:
  - Assert dashboard lists the correct count of verified transactions.
