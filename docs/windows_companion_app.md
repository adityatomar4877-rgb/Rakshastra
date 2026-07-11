# ☤ WINDOWS DESKTOP COMPANION
> **Windows Agent, Registry/Filesystem Scanner, and Winget Packaging Specifications**

The Rakshastra Windows Companion App is a native C#/WPF client distributed via Windows Package Manager (`winget`) designed to run local on-premise scans, load credential vaults, and perform desktop OCR.

---

## 💎 1. Key Desktop Capabilities

| Capability | Feature | Technical Implementation |
| :--- | :--- | :--- |
| **System-Level Scans** | Registry & Local Disk Audit | Direct inspection of autostart locations, system environment variables, and active ports. |
| **Desktop OCR** | Screen Capture Ingestion | Automated OCR extraction of threat text from screenshots using local Windows.Media.OCR engines. |
| **Credential Manager** | Secure Local Vault | Encryption of Google Gemini API keys using Windows DPAPI (Data Protection API) vaults. |
| **Offline Sync Cache** | Air-Gapped Queueing | SQLite local cache queueing extracted threat indicators until connection to the FastAPI server is restored. |

---

## ⚙️ 2. Package Distribution via `winget`

To support standard corporate deployments, the companion installer is registered as an official silent MSI package on `winget`:

```cmd
:: Install the authoritative Rakshastra Desktop Agent
winget install Rakshastra.Companion
```

This automates:
1. Downloading the certified `.msix` container.
2. Registering background execution services (`RakshastraScrubber.exe`).
3. Configuring local port listeners for host web-dashboard communication.

---

## 🔄 3. Hybrid Synchronization Pipeline

Browser sandbox limitations prevent web dashboards from executing local security scans. The Windows Companion bridges this gap:

```
┌─────────────────────────────────┐            ┌─────────────────────────────────┐
│     BROWSER WEB DASHBOARD       │            │    WINDOWS DESKTOP COMPANION    │
│  (Displays global threat graph  │            │  (Accesses filesystem, logs,    │
│   and correlation nodes)        │            │   ports, registry, local OCR)   │
└────────────────┬────────────────┘            └────────────────┬────────────────┘
                 │                                              │
                 │              Pairing Handshake               │
                 └──────────────────────────────────────────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │ RAKSHASTRA API  │
                               │ (FastAPI Server)│
                               └─────────────────┘
```

1. **Pairing Handshake**: The user launches the Windows Companion and scans the pairing QR code from the Web UI.
2. **Local Registry & File Auditing**: The companion runs local file checks and posts results to `/api/v1/threat/analyze-text`.
3. **Integrated Evidence**: Screen captures are processed using local hardware acceleration, and the extracted indicators are posted to the central graph.
