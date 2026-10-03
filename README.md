# RootWatch

RootWatch is a three-service incident detection and investigation demo:

- `services/monitoring`: FastAPI monitoring, deterministic incident detection, mock storage, and Snowflake storage
- `services/investigator`: FastAPI evidence engine, local source search, and Ollama/Qwen reasoning
- `web`: React/Vite incident dashboard and investigation chat

## Local integrated startup

Ollama and `qwen2.5:3b` must already be available:

```bash
ollama list
```

On macOS, launch all three services in separate Terminal windows with:

```bash
cd /Users/ash/Programs/RootWatch
./scripts/run-dev.command
```

Press `Ctrl+C` in each opened window to stop its service. If Ollama was not already running, the launcher also opens an Ollama Terminal window.

Start monitoring from terminal 1:

```bash
cd /Users/ash/Programs/RootWatch/services/monitoring
../investigator/.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

Start the investigator from terminal 2:

```bash
cd /Users/ash/Programs/RootWatch/services/investigator
source .venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

Start the frontend from terminal 3:

```bash
cd /Users/ash/Programs/RootWatch/web
npm install
npm run dev
```

Open http://localhost:5173. Monitoring documentation is available at http://localhost:8000/docs and investigator documentation at http://localhost:8001/docs.

The checked-in `.env.example` files document configuration. Local `.env` files are ignored by Git. The integrated local configuration uses monitoring mock storage, the real monitoring HTTP provider in the investigator, and live frontend APIs.

## Verify

```bash
cd /Users/ash/Programs/RootWatch/services/monitoring
../investigator/.venv/bin/python -m pytest -q

cd /Users/ash/Programs/RootWatch/services/investigator
.venv/bin/python -m pytest -q

cd /Users/ash/Programs/RootWatch/web
npm run build
```

GitHub Actions automatically installs all Python and Node dependencies and runs these checks on every push and pull request using `.github/workflows/ci.yml`.

## Optional traffic generator

The monitoring service seeds a live incident at startup. To generate new incident traffic:

```bash
cd /Users/ash/Programs/RootWatch/services/monitoring
../investigator/.venv/bin/python -m generator.generate_logs --scenario incident --batches 4 --interval 1
```

## Docker Compose

Compose starts the three RootWatch services with deterministic investigator fallback enabled:

```bash
docker compose up --build
```

For the full Qwen experience, use the local startup above so the investigator can reach the locally running Ollama instance.
