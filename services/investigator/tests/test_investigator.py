import asyncio
import json
from pathlib import Path

from app.config import Settings
from app.investigation import Investigator
from app.models import ChatRequest
from app.providers.mock_incident_provider import MockIncidentProvider


SERVICE_ROOT = Path(__file__).resolve().parents[1]


def build_investigator() -> Investigator:
    settings = Settings(
        incident_provider="mock",
        mock_incident_path=SERVICE_ROOT / "mock_data/incident-context.json",
        source_root=SERVICE_ROOT / "demo_repository",
        use_llm=False,
    )
    provider = MockIncidentProvider(settings.mock_incident_path)
    return Investigator(settings, provider)


def test_investigation_returns_grounded_code_location():
    result = asyncio.run(
        build_investigator().investigate(
            ChatRequest(incident_id="INC-001", message="Where in the code is this failing?")
        )
    )
    assert result.intent == "code_location"
    assert result.code_locations
    assert result.code_locations[0].path == "services/application_service.py"
    assert any(claim.type == "fact" for claim in result.claims)
    assert result.model_used is None


def test_summary_works_without_model():
    result = asyncio.run(
        build_investigator().investigate(
            ChatRequest(incident_id="INC-001", message="What is happening?")
        )
    )
    assert "47 of 57" in result.answer
    assert result.confidence >= 0.7


def test_accepts_shared_monitoring_contract():
    contract_path = SERVICE_ROOT.parents[1] / "contracts/examples/investigation-context.json"
    payload = json.loads(contract_path.read_text(encoding="utf-8"))
    from app.models import IncidentContext

    context = IncidentContext.model_validate(payload)
    assert context.incident.started_at == context.statistics.window_start
    assert context.recent_logs[0].log_id.startswith("demo-log-")
    assert context.recent_logs[0].message == "Connection pool exhausted"
    assert context.deployment is not None
    assert context.deployment.version == "v1.4.8"
    assert context.statistics.window_minutes >= 1
