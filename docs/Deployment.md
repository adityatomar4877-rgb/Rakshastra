# ☤ RAKSHASTRA DEPLOYMENT MANUAL
> **Local, Containerized (Docker), and Secure Air-Gapped Deployment Guides**

Rakshastra supports multiple deployment topographies: local developer environments, containerized configurations using Docker Compose, and secure, air-gapped corporate environments.

---

## ⚡ 1. Deployment Topology Options

| Environment | Mode | Connectivity | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **Local / Dev** | CLI + Web App | Internet (Gemini API) | Sandbox testing, tool execution debugging, custom engine updates. |
| **Containerized** | Docker Compose | Hybrid (Gemini API + Local DB) | SME production networks, continuous monitoring. |
| **Air-Gapped** | Secure Server | Isolated (Offline Fallbacks) | High-security financial, government, or forensic network deployments. |

---

## ⚙️ 2. Option A: Docker Compose Deployment

The standard production path bundles the FastAPI backend, the React/Vite dashboard, and SQLite storage volumes.

### Docker Compose Configuration
Create a `docker-compose.yml` file in the root of your directory:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: rakshastra-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - RAKSHASTRA_ENV=production
      - RAKSHASTRA_SESSION_SOURCE=docker
    volumes:
      - rakshastra-data:/root/.rakshastra
      - /var/run/docker.sock:/var/run/docker.sock

  frontend:
    image: node:18-alpine
    container_name: rakshastra-frontend
    working_dir: /app
    volumes:
      - ./web:/app
    ports:
      - "5173:5173"
    command: sh -c "npm install && npm run dev -- --host"
    depends_on:
      - backend

volumes:
  rakshastra-data:
    driver: local
```

### Launch Command
Build and start the containerized services in background daemon mode:
```bash
docker-compose up -d --build
```

---

## 🔒 3. Option B: On-Premise Air-Gapped Setup

To deploy Rakshastra in secure networks with strict data protection and no outbound internet:

```
┌──────────────────────────────────────────────────────────────────┐
│                    SECURE INTERNAL NETWORK                       │
│                                                                  │
│  ┌────────────────────┐            ┌──────────────────────────┐  │
│  │ Ingested Evidence  ├───────────►│  Rakshastra Backend      │  │
│  │ (Screenshots/Logs) │            │  - Local DB Storage      │  │
│  └────────────────────┘            │  - Offline Fallbacks     │  │
│                                    └────────────┬─────────────┘  │
│                                                 │                │
│                                                 ▼                │
│                                    ┌──────────────────────────┐  │
│                                    │  Ollama / Local LLM      │  │
│                                    │  - Llama-3-8B / Qwen-2.5 │  │
│                                    └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 1. Enable Heuristic Offline Mode
In the configuration file `config/production.yaml`, enable the heuristic-backed fallback engine to bypass Google API calls entirely:
```yaml
heuristics:
  enable_offline_fallbacks: true
  max_local_iterations: 15
```

### 2. Connect to Local LLM Providers
Deploy [Ollama](https://ollama.com) or an OpenAI-compatible model server on your local network. Point the custom provider switch to your local instance:
```bash
rakshastra model custom-local --base-url="http://127.0.0.1:11434/v1" --api-key="dummy-key"
```

---

## 🛠️ 4. Environmental Configuration Variables

Configure these settings inside your `.env` file to customize Rakshastra's runtime behavior:

| Environment Variable | Default Value | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | None | Primary Google AI Studio credential. |
| `RAKSHASTRA_ENV` | `development` | Environment mode (`development`, `production`). |
| `WHATSAPP_MODE` | `bot` | Gateway bridge mode (`bot`, `self-chat`). |
| `ALGORAND_NODE` | `https://testnet-api.algonode.cloud` | Active Algorand endpoint used for x402 payment validation. |
| `CHECKPOINTS_ENABLED` | `true` | Auto-snapshot file status before running mutating tools. |
