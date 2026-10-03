# Integration

The browser calls monitoring directly for incidents and context, and calls the investigator for chat. The investigator calls monitoring for authoritative incident evidence.

```text
Browser :5173 ──► Monitoring :8000
       └────────► Investigator :8001 ──► Monitoring :8000
                                      └─► Ollama :11434
```

## URLs

- Monitoring: `http://localhost:8000`
- Investigator: `http://localhost:8001/api/v1`
- Frontend: `http://localhost:5173`
- Ollama: `http://localhost:11434`

## Contract adaptation

Monitoring publishes `start_time`, `last_seen`, `id`, `error_message`, and `deployment_version`. The investigator accepts those names and maps them to its internal `started_at`, `last_seen_at`, `log_id`, `message`, and `version` fields. Statistics window minutes are derived from monitoring's `window_start` and `window_end`.

The frontend maps monitoring's lowercase severity values into its display format. After a chat response, it replaces placeholder confidence, evidence, source file, function, and line values with investigator output.

## Local configuration

```env
INCIDENT_PROVIDER=api
MONITORING_API_URL=http://localhost:8000
VITE_USE_MOCKS=false
VITE_MONITORING_API=http://localhost:8000
VITE_AI_API=http://localhost:8001/api/v1
```
