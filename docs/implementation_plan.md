# ☤ IMPLEMENTATION PLAN
> **WhatsApp Platform Bot Migration & Windows Process Lifecycle Management**

This specification defines the deployment steps to migrate the WhatsApp platform adapter to **bot** mode and implement force-kill process cleanup routines for Windows servers.

---

## 🚦 1. Proposed Modifications

| Component | File Path | Type | Action & Goal |
| :--- | :--- | :--- | :--- |
| **Configuration** | [`.env`](file:///C:/Users/intel/AppData/Local/rakshastra/.env) | **Modify** | Swap `WHATSAPP_MODE=self-chat` to `WHATSAPP_MODE=bot` to enable multi-contact ingestion. |
| **Adapter Code** | [`adapter.py`](file:///C:/rakshastra/plugins/platforms/whatsapp/adapter.py) | **Modify** | Update `_terminate_bridge_process()` with `/F` parameter force flag under Windows `taskkill`. |

---

## 🛠️ 2. Step-by-Step Changes

### A. Enable Ingestion In Gateways
Update [.env](file:///C:/Users/intel/AppData/Local/rakshastra/.env) variables:
* Set `WHATSAPP_MODE=bot`. This instructs the Baileys handler to process and reply to inbound requests from all allowed contacts.

### B. Implement Force Process Termination
Update the platform adapter [`adapter.py`](file:///C:/rakshastra/plugins/platforms/whatsapp/adapter.py):
* Modify the process termination subprocess call to execute `taskkill /F /PID <pid>` on Windows platforms.
* This releases port `3000` immediately, preventing subsequent daemon binding failures.

---

## 🧪 3. Verification Plan

### 1. Automated Regression Suite
Run core platform tests to verify process lifecycle utilities are healthy:
```bash
python -m pytest tests/tools/test_cyber_intelligence_tools.py
```

### 2. Manual End-to-End Validation
1. **Initialize Gateway Daemon**: Execute `rakshastra gateway start`.
2. **Verify Port Handshake**: Confirm port `3000` binds cleanly without timing out.
3. **Inbound Test**: Send an investigation query from client number `919755745209` to the WhatsApp bot JID; confirm automated response is returned.
