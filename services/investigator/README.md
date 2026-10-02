# RootWatch Investigator

Standalone AI investigation service for RootWatch. It receives incident context from a mock fixture or the monitoring API, searches a configured source repository, builds traceable evidence, and uses an Ollama-hosted open-weight model to write the final explanation.

The service remains usable when Ollama is unavailable unless `LLM_REQUIRED=true`. In that case it returns deterministic evidence-backed answers.

## Requirements

- Python 3.11+
- Optional: Ollama with `qwen2.5:3b`

## Setup

```bash
cd services/investigator
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

To use the local model:

```bash
ollama pull qwen2.5:3b
ollama serve
```

Start the API:

```bash
uvicorn app.main:app --reload --port 8001
```

OpenAPI documentation is available at `http://localhost:8001/docs`.

## Try it

```bash
curl -X POST http://localhost:8001/api/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{"incident_id":"INC-001","message":"Where is this error coming from?"}'
```

## Provider modes

Mock mode reads `mock_data/incident-context.json`:

```env
INCIDENT_PROVIDER=mock
```

API mode calls the monitoring service:

```env
INCIDENT_PROVIDER=api
MONITORING_API_URL=http://localhost:8000/api/v1
```

The monitoring service must implement:

```text
GET /investigation/context/{incident_id}
```

## Model behavior

```env
USE_LLM=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
LLM_REQUIRED=false
```

Set `USE_LLM=false` for deterministic local development. Set `LLM_REQUIRED=true` if a model outage should fail the request instead of using fallback answers.

## Tests

```bash
pytest
```

## Docker

```bash
docker build -t rootwatch-investigator .
docker run --rm -p 8001:8001 --env-file .env rootwatch-investigator
```
