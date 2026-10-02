from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


SERVICE_ROOT = Path(__file__).resolve().parents[1]


def make_client() -> TestClient:
    settings = Settings(
        incident_provider="mock",
        mock_incident_path=SERVICE_ROOT / "mock_data/incident-context.json",
        source_root=SERVICE_ROOT / "demo_repository",
        use_llm=False,
    )
    return TestClient(create_app(settings))


def test_health():
    with make_client() as client:
        response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_chat():
    with make_client() as client:
        response = client.post(
            "/api/v1/chat",
            json={"incident_id": "INC-001", "message": "Why is this failing?"},
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "cause"
    assert payload["evidence"]
    assert payload["code_locations"]


def test_unknown_incident_has_standard_error():
    with make_client() as client:
        response = client.post(
            "/api/v1/chat",
            json={"incident_id": "INC-999", "message": "What happened?"},
        )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "INCIDENT_NOT_FOUND"
