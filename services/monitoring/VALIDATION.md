# Local validation — October 2, 2026

- Windows, Python 3.14.3; installed versions saved in requirements.lock.txt.
- `python -m pytest -q`: four tests passed. The installed Starlette version emits an httpx TestClient deprecation warning; the tests execute successfully.
- `python -m compileall -q app tests`: passed.
- `python -m app.export_contract --update-contracts`: exported actual typed context response and schema from injected mock storage.
- Started Uvicorn on localhost port 8765 with MOCK_MODE=true and MOCK_SEED=false.
- Ran `python -m generator.generate_logs --url http://127.0.0.1:8765 --scenario incident --batches 4 --interval 0.1`: four successful batches, 48 logs ingested, one active incident.
- Exercised every required GET endpoint via real HTTP: all eight returned 200.
- Live context assertions passed: 12 application requests, at least five failed requests, matching v1.4.8 deployment metadata.
- Stopped the temporary validation server afterward.

Snowflake connectivity and SQL execution were not tested against an account; no credentials were supplied. The Snowflake connector was installed and importable. No AI service is needed for these checks.

Monorepo integration: moved code into dedicated API/repository/detection/service modules and reran all four tests and live HTTP validation. The saved monitoring OpenAPI paths exactly matched `/openapi.json` on the running server. Existing root configuration, LICENSE, investigator service, frontend, and teammate contract/example files were unchanged. Docker was not run.
