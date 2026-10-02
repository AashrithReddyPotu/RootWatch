# ⚡ RootWatch

### AI-Powered Incident Detection & Root Cause Investigation

RootWatch is an intelligent observability platform that helps engineering teams move from **“something is broken”** to **“here is the likely cause and where to look in the code.”**

It combines deterministic incident detection, backend telemetry, deployment context, AI-assisted investigation, and source-code reasoning in one dashboard.

---

## 🎯 The Problem

Backend incidents generate large amounts of logs, errors, metrics, and deployment information.

When something fails, developers often have to manually answer:

- What is failing?
- When did it start?
- How many requests are affected?
- Did a deployment cause it?
- What is the likely root cause?
- Which file or function should I investigate?

RootWatch brings those signals together and turns them into an evidence-backed investigation.

---

## 💡 Our Solution

RootWatch follows a simple investigation pipeline:

```text
Backend Traffic
      │
      ▼
┌─────────────────────┐
│ Monitoring Service  │
│                     │
│ Logs                │
│ Incident Detection  │
│ Error Analytics     │
│ Deployment Context  │
└──────────┬──────────┘
           │
           │ Incident Context
           ▼
┌─────────────────────┐
│ AI Investigator     │
│                     │
│ Evidence Reasoning  │
│ Root Cause Analysis │
│ Source-Code Search  │
└──────────┬──────────┘
           │
           │ Investigation
           ▼
┌─────────────────────┐
│ RootWatch Dashboard │
│                     │
│ Incidents           │
│ Analytics           │
│ AI Chat             │
│ Evidence            │
│ Code Trace          │
└─────────────────────┘
```

---

## ✨ Key Features

### 🚨 Automated Incident Detection

RootWatch monitors backend traffic and detects recurring failures using deterministic rules rather than relying on AI for detection.

It tracks:

- HTTP failures
- error frequency
- failure rates
- affected endpoints
- affected services
- incident severity

---

### 📊 Real-Time Observability Dashboard

The RootWatch dashboard provides engineers with a centralized view of:

- active incidents
- total failures
- affected services
- failure rates
- request activity
- error distribution
- deployment impact
- system health

---

### 🤖 AI Incident Investigator

Developers can investigate incidents conversationally.

Example questions:

```text
Why are applications failing?
```

```text
What evidence supports this conclusion?
```

```text
Did the latest deployment contribute to this?
```

```text
Where should I look in the code?
```

The investigator uses incident context and source-code evidence to generate grounded responses.

---

### 🔎 Evidence-Based Reasoning

RootWatch separates AI conclusions from the evidence supporting them.

Example:

```text
Likely Root Cause
Database connection lifecycle issue

Evidence
✓ Repeated DATABASE_CONNECTION_TIMEOUT failures
✓ Failure rate increased significantly
✓ Failures appeared after deployment v1.4.8
✓ application_service.py changed in the deployment
```

This helps engineers understand **why** RootWatch reached a conclusion instead of receiving an unexplained AI answer.

---

### 💻 Code Trace

RootWatch can identify likely source-code locations associated with an incident.

Example:

```text
File:
services/application_service.py

Function:
submit_application()

Line:
24
```

This helps developers move directly from an operational incident to the relevant implementation area.

---

### 🚀 Deployment Correlation

RootWatch combines incident telemetry with deployment metadata to identify failures that appear after a release.

Example:

```text
Deployment: v1.4.8

Before Deployment
Error Rate: 4%

After Deployment
Error Rate: 82%
```

---

## 🏗️ Architecture

RootWatch is built as three independent components.

```text
                         ┌─────────────────────┐
                         │      Frontend       │
                         │   React + Vite      │
                         │   localhost:5173    │
                         └─────────┬───────────┘
                                   │
                       ┌───────────┴───────────┐
                       │                       │
                       ▼                       ▼
             ┌──────────────────┐    ┌──────────────────┐
             │ Monitoring API   │    │ Investigator API │
             │ FastAPI          │    │ FastAPI          │
             │ localhost:8000   │    │ localhost:8001   │
             └────────┬─────────┘    └────────┬─────────┘
                      │                       │
                      ▼                       ▼
             ┌──────────────────┐    ┌──────────────────┐
             │ Snowflake / Mock │    │ AI + Code Search │
             │ Storage          │    │ Investigation    │
             └──────────────────┘    └──────────────────┘
```

The services communicate through HTTP/JSON APIs, allowing each component to be developed and tested independently.

---

## 🧩 Components

### 1. Monitoring & Data Layer

Responsible for:

- synthetic backend traffic
- log ingestion
- deterministic incident detection
- incident management
- deployment metadata
- error analytics
- Snowflake integration
- investigation context generation

Important endpoints:

```text
GET  /health
POST /logs
GET  /logs/recent
GET  /incidents
GET  /incidents/{incident_id}
GET  /incidents/{incident_id}/logs
GET  /deployments/recent
GET  /analytics/error-frequency
GET  /investigation/context/{incident_id}
```

---

### 2. AI Investigation Engine

Responsible for:

- incident interpretation
- evidence generation
- root-cause investigation
- source-code search
- code-location identification
- conversational investigation
- open-weight LLM integration

The service supports mock incident context for local development and an API-backed incident provider for integration.

---

### 3. Frontend & UX

Built with:

- React
- TypeScript
- Vite
- CSS

The interface contains five primary views:

```text
Dashboard
Incidents
Analytics
AI Investigator
Code Trace
```

The dashboard is designed as an engineering observability interface where telemetry, AI reasoning, evidence, and code context can be viewed together.

---

## 📂 Project Structure

```text
RootWatch/
│
├── contracts/
│   ├── monitoring-api.yaml
│   ├── investigator-api.yaml
│   └── examples/
│
├── services/
│   │
│   ├── monitoring/
│   │   ├── app/
│   │   ├── generator/
│   │   ├── handoff/
│   │   ├── mock_data/
│   │   ├── sql/
│   │   └── tests/
│   │
│   └── investigator/
│       ├── app/
│       ├── demo_repository/
│       ├── mock_data/
│       └── tests/
│
├── web/
│   ├── public/
│   └── src/
│
├── docs/
├── docker-compose.yml
└── README.md
```

---

# 🚀 Running RootWatch Locally

RootWatch can be started using three terminals.

## 1️⃣ Monitoring Service

```bash
cd services/monitoring

python3 -m venv .venv
source .venv/bin/activate

python -m pip install -r requirements.txt
```

Run locally using mock storage:

```bash
MOCK_MODE=true MOCK_SEED=true \
python -m uvicorn app.main:app --reload --port 8000
```

Test:

```bash
curl http://localhost:8000/health
```

Expected:

```json
{
  "status": "ok",
  "storage": "mock"
}
```

View detected incidents:

```bash
curl http://localhost:8000/incidents
```

Monitoring API:

```text
http://localhost:8000
```

---

## 2️⃣ AI Investigator

Open another terminal:

```bash
cd services/investigator

python3 -m venv .venv
source .venv/bin/activate

python -m pip install -r requirements.txt
```

Start the Investigator:

```bash
python -m uvicorn app.main:app --reload --port 8001
```

Test:

```bash
curl http://localhost:8001/health
```

Investigator API:

```text
http://localhost:8001
```

---

## 3️⃣ Frontend

Open another terminal:

```bash
cd web

npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

---

## 🧪 Example Incident

RootWatch includes a simulated backend failure involving:

```text
POST /api/applications
```

with the recurring error:

```text
DATABASE_CONNECTION_TIMEOUT
```

The monitoring service detects the failure pattern and creates an incident.

RootWatch can then correlate:

```text
Error telemetry
      +
Failure statistics
      +
Deployment metadata
      +
Source-code changes
      ↓
AI Investigation
      ↓
Evidence
      ↓
Likely Code Location
```

An investigation may identify:

```text
services/application_service.py
```

and:

```text
submit_application()
```

as an area that should be inspected.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend APIs | Python, FastAPI |
| Monitoring | Python |
| Data | Snowflake / Mock Storage |
| AI Investigation | Open-weight LLM support |
| Code Analysis | Local source-code search |
| API Communication | REST + JSON |
| API Contracts | OpenAPI / YAML |
| Development | Git + GitHub |

---

## 🧠 Design Philosophy

A core RootWatch principle is:

> **AI investigates incidents. It does not decide whether an incident exists.**

Incident detection is deterministic.

AI is introduced after detection to help engineers:

1. understand the failure,
2. correlate evidence,
3. investigate possible causes, and
4. identify relevant source code.

This keeps monitoring predictable while still taking advantage of AI-assisted reasoning.

---

## 🎬 Demo Flow

For a quick RootWatch demonstration:

1. Open the **Dashboard**.
2. Show the active `/api/applications` incident.
3. Show the failure rate and telemetry.
4. Open **Incidents** for detailed context.
5. Open **Analytics** to show error and request patterns.
6. Open **AI Investigator**.
7. Ask why the application endpoint is failing.
8. Show RootWatch's supporting evidence.
9. Open **Code Trace**.
10. Show the likely file, function, and code location.

---

## 🔮 Future Improvements

RootWatch can be expanded with:

- production log ingestion
- GitHub repository integration
- automated deployment tracking
- historical incident analysis
- alerting integrations
- additional LLM providers
- semantic source-code retrieval
- team collaboration
- incident timelines
- automated remediation recommendations
- production-scale observability integrations

---

## ⚡ RootWatch

### Detect. Investigate. Explain. Trace.

**From backend failure to evidence-backed root cause investigation.**
