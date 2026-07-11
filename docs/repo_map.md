# ☤ REPOSITORY ARCHITECTURE MAP
> **Codebase Directory Layout, Module Boundaries, and Component Index**

This reference map documents the directory structures, package boundaries, and primary source code assets of the Rakshastra repository.

---

## 📂 1. Directory Structure Reference

| Directory | Scope & Status | Description | Primary Code Assets |
| :--- | :--- | :--- | :--- |
| **`rakshastra_core/`** | **Authoritative Core** | Foundational threat analysis engines, entity resolution, graph engines, and autonomous orchestrators. | `/intelligence/`, `/models/` |
| **`rakshastra_cli/`** | **Authoritative CLI** | FastAPI backend server, setup wizard, CLI command interface, and bootstrap utilities. | `main.py`, `setup.py`, `web_server.py` |
| **`web/`** | **Authoritative Web UI** | React + TypeScript web dashboard powered by Vite for graphical investigator analysis. | `/src/components/`, `/src/pages/` |
| **`agent/`** | **Authoritative Agent** | Native Google Gemini adapters, message loop, context compression, and runtime helper utils. | `gemini_native_adapter.py`, `run_agent.py` |
| **`tools/`** | **Authoritative Tools** | Cyber intelligence tool wrappers, file editing, terminal utilities, and approval gates. | `cyber_intelligence_tools.py`, `todo_tool.py` |
| **`plugins/`** | **Authoritative Gateways**| Chat adapters and daemon bridges for external messaging integrations. | `/platforms/whatsapp/`, `/platforms/telegram/` |
| **`docs/`** | **Authoritative Docs** | Hackathon strategies, product plans, API specifications, and setup manuals. | `Architecture.md`, `API.md`, `Roadmap.md` |
| **`tests/`** | **Authoritative Tests** | Comprehensive unit, stress, integration, and platform adapter test suites. | `tests/rakshastra_core/`, `tests/rakshastra_cli/` |

---

## 🧱 2. System Layer Boundaries

```
┌────────────────────────────────────────────────────────┐
│                        WEB UI                          │
│                     (web/src/*)                        │
└───────────┬────────────────────────────────┬───────────┘
            │ API Queries                    │ WebSockets
┌───────────▼────────────────────────────────▼───────────┐
│                     CLI & WEB SERVER                   │
│                (rakshastra_cli/web_server.py)          │
└───────────┬────────────────────────────────┬───────────┘
            │ Execution                      │ Tool Calls
┌───────────▼────────────────────────────────▼───────────┐
│                     INTELLIGENCE CORE                  │
│                     (rakshastra_core/*)                │
└────────────────────────────────────────────────────────┘
```
