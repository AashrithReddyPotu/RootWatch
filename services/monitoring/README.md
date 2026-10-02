# RootWatch — Person 1: monitoring and data infrastructure

Independent FastAPI backend for the HackArizona team. It ingests synthetic server logs, stores them in Snowflake (or local memory), detects recurring failures using fixed rules, and exposes JSON. There is no frontend, LLM, chatbot, AI reasoning, or source-code analysis here.

## Quick start (PowerShell, Python 3.11+)

From the repository root, first run `cd services/monitoring`. Run all commands below from that service folder:
did uoi
```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/docs for interactive API documentation. Default `MOCK_MODE=true` requires no Snowflake credentials. A fixture seeds 60 requests and one active application incident at startup; all fixture dates are shifted together to the present. Memory resets on restart. Set `MOCK_SEED=false` in `.env` to start empty.

In a second terminal, from the same folder:

```powershell
.\.venv\Scripts\python.exe -m generator.generate_logs --scenario recurring --interval 5
```

The generator sends 12 requests per batch to this API; the API inserts them into the selected store and runs detection. Most traffic succeeds. The recurring scenario repeats 10 healthy batches, 20 batches with application failures, then 30 healthy batches. At the default interval the recovery period is long enough to resolve incidents. Ctrl+C stops it. The generator uses a seeded random sequence for reproducible status/latency patterns, with real timestamps and unique request IDs.

For an immediate failure demo:

```powershell
.\.venv\Scripts\python.exe -m generator.generate_logs --scenario incident --batches 4 --interval 1
```

For successful traffic:

```powershell
.\.venv\Scripts\python.exe -m generator.generate_logs --scenario healthy --batches 4 --interval 1
```

macOS/Linux equivalents: `python3 -m venv .venv`, `.venv/bin/python -m pip install -r requirements.txt`, `cp .env.example .env`, `.venv/bin/python -m uvicorn app.main:app --reload`. Use `.venv/bin/python` for generator/test commands.

## Team integration

Person 2 consumes `GET /investigation/context/{incident_id}`. Share `../../contracts/examples/investigation-context.json` immediately; it is a real serialized API response from the fixture. `mock_data/investigation-context.schema.json` defines the exact response contract. Person 3 can call all GET endpoints directly. Arrays are returned directly, without pagination envelopes. IDs are generated; fetch `/incidents` instead of hardcoding `INC-001`.

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
$incidents = Invoke-RestMethod http://127.0.0.1:8000/incidents
$id = $incidents[0].incident_id
Invoke-RestMethod "http://127.0.0.1:8000/investigation/context/$id" | ConvertTo-Json -Depth 10
```

Context contains:

- `incident`: identity, endpoint/method/service, error type, status, times, cumulative matching failure count, current detector-window failure rate, severity, and original deployment version.
- `recent_logs`: newest requests for that service/method/endpoint since incident start, including successes and other errors. `error_message` is the log message field.
- `deployment`: metadata matching the incident's original version and deployed no later than its start; `null` if unknown. Its version field is `deployment_version`.
- `statistics`: all requests from incident start to now (or last failure for resolved incidents), failed request count, failure rate, mean latency, and counts by error type. These aggregates are computed before the `recent_logs` limit, so they are never based on a truncated sample.

All timestamps include a timezone; rates are fractions from 0 to 1. `incident.failure_rate` uses the latest 120-second detection window. `statistics.failure_rate` uses the longer incident interval, so those rates can differ. Context is evidence only; the separate service performs investigation.

## HTTP API

| Method | Path | Parameters / response |
|---|---|---|
| GET | `/health` | status and storage mode; 503 on storage/detector failure |
| GET | `/logs/recent` | `minutes=10` (1–1440), `limit=100` (1–1000), optional `endpoint`, `error_type`; log array |
| GET | `/incidents` | optional `status=active` or `resolved`, `limit=100`; incident array newest first |
| GET | `/incidents/{incident_id}` | incident; 404 if missing |
| GET | `/incidents/{incident_id}/logs` | `limit=100`; related successes and failures newest first |
| GET | `/deployments/recent` | `limit=10` (1–100); deployment array |
| GET | `/analytics/error-frequency` | `minutes=10`, optional `endpoint`, `error_type`; window totals and grouped error counts |
| GET | `/investigation/context/{incident_id}` | `limit=100`; typed integration context; 404 if missing |
| POST | `/logs` | array of 1–1000 log objects; returns submitted `accepted` count (includes retries) |
| POST | `/deployments` | deployment object, upserted by version |

Log POST requires timestamp, endpoint, method, status_code, latency_ms, and deployment_version. Defaults generate ID/request ID and use service `careers-backend`. Future timestamps and timezone-free timestamps are rejected. Retrying identical IDs does not add occurrences; an existing ID's first payload is retained. Analytics `failed_requests` and `failure_rate` include all 5xx responses for the selected endpoint/time window; `error_type` filters only `matching_errors` and `groups`, preserving a meaningful denominator. Empty windows return zero counts and rates.

## Detection rules

Detection runs immediately after log ingestion and every five seconds:

1. Within the inclusive last 120 seconds, create an incident if the same service + method + endpoint + error type has at least five 5xx responses.
2. Also create one if the endpoint has at least ten requests and its total 5xx failure rate exceeds 30%, provided that error type occurs in the window. The sample minimum avoids treating one isolated failure as persistent.
3. Update an active problem instead of duplicating it. Matching failure count is cumulative since its start, computed from stored log IDs. HTTP 4xx responses do not count as server failures. Missing 5xx error types use `HTTP_5XX`.
4. Resolve after 120 seconds without that problem's failures, including when traffic stops. The next recurrence creates a new incident ID. Resolution means quiet traffic, not proof of a fix.
5. Severity is `high` at >=50% endpoint failures, otherwise `medium`.

Old logs are stored but cannot create an incident outside the current window. Requests arriving late within the window are eligible. Incident IDs derive from problem identity and first observed failure timestamp. Use one API process (`--workers 1`, the default): a process lock serializes ingestion/detection. Multiple API instances/writers are outside this MVP's deduplication guarantee.

## Snowflake mode

1. Copy `.env.example` to `.env`, supply the account identifier, user, and password. Use an account/role permitted to create the database and warehouse; your event organizer supplies the account. Existing objects are preserved by `IF NOT EXISTS`.
2. Leave database/schema/warehouse as `ROOTWATCH`, `PUBLIC`, `ROOTWATCH_WH` for the included setup. Run:

```powershell
.\.venv\Scripts\python.exe -m app.setup_snowflake
```

Alternatively execute `sql/schema.sql` in a Snowflake worksheet. For an organizer-provided database/warehouse, adapt the setup script's object names before running it and match `.env`. The setup helper uses the script's names; it does not substitute environment identifiers into SQL.

3. Set `MOCK_MODE=false` and restart the API. Missing settings fail startup clearly. Snowflake starts empty; run the generator to populate logs and deployments. The same HTTP APIs and detector run in both modes.

The connector uses parameterized SQL and short-lived connections. Log batches are transactional; incidents are upserted separately and the periodic detector retries after transient failure. Snowflake tables store explicit typed columns; deployment files are a VARIANT array. No Cortex, LLM API, Kafka, or separate streaming service is required. The X-Small warehouse suspends after 60 idle seconds; periodic detection queries can keep it active while this API runs. Stop the API when the demo ends.

## Validate and regenerate contracts

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m app.export_contract
.\.venv\Scripts\python.exe -m compileall -q app tests
```

Tests cover all eight GET routes, ingestion, deduplication, count and rate thresholds, isolated problems, resolution/recurrence, validation, analytics filters, and context totals. Tests use injected memory storage regardless of your `.env` setting. `export_contract` also explicitly uses memory storage; it writes service-local mock responses and schema. To initialize or intentionally update the shared boundary, use `python -m app.export_contract --update-contracts`; coordinate later contract changes with the team.

## Files and troubleshooting

```text
app/
  main.py                        application wiring and detection timer
  config.py, models.py            environment and typed contracts
  api/                           health, logs/analytics, incidents/deployments, context routes
  detection/incident_detector.py deterministic rules
  repositories/                  base interface, memory and Snowflake adapters
  services/                      monitor coordinator and context builder
  setup_snowflake.py              execute SQL setup
  export_contract.py              regenerate local fixtures and optional shared contracts
generator/generate_logs.py        continuous traffic client
sql/schema.sql                   schema setup
sql/seed.sql                     optional demo deployment
mock_data/                       dataset, context response and JSON schema
tests/test_monitoring.py
Dockerfile
.env.example
requirements.txt
requirements.lock.txt
```

For exact dependency reproduction, install `requirements.lock.txt` instead of `requirements.txt`. It was generated on Windows with Python 3.14; Python 3.11+ can use the broad requirements if a pinned dependency has platform constraints.

If port 8000 is taken, start with `--port 8010` and give the generator `--url http://127.0.0.1:8010`. Restart after changing `.env`. A fresh mock instance reseeds data; disable `MOCK_SEED` for an empty live-generator demonstration. `CORS_ORIGINS` is a comma-separated list; update it for the frontend's origin. The ingestion endpoints have no authentication for this local hackathon demo. Keep the service on localhost; authentication, distributed coordination, retention, and high-volume query optimization are outside this MVP.

Snowflake credentialed execution requires your event account and is not part of local mock validation. No secrets belong in the repository; `.env` is ignored.


## Container (monitoring service only)

From the repository root:

```powershell
docker build -t rootwatch-monitoring services/monitoring
docker run --rm -p 8000:8000 -e MOCK_MODE=true rootwatch-monitoring
```

Or, after making a service-local `.env`, pass `--env-file services/monitoring/.env`. The Docker image uses one worker and the same backend. Team-level Compose belongs to Person 3 and is intentionally unchanged. Docker execution requires Docker installed/running and was not part of local validation.

Your working branch is `person1-monitoring`. Review from the repository root with `git status --short` and `git diff`. Only monitoring-owned paths were initialized. Root files (including the existing LICENSE), investigator files, and frontend files were preserved.
