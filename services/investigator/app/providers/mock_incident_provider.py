import json
from pathlib import Path

from app.models import IncidentContext
from app.providers.base import IncidentNotFoundError, IncidentProvider, IncidentProviderError


class MockIncidentProvider(IncidentProvider):
    def __init__(self, fixture_path: Path):
        self.fixture_path = fixture_path

    async def get_context(self, incident_id: str) -> IncidentContext:
        try:
            payload = json.loads(self.fixture_path.read_text(encoding="utf-8"))
            context = IncidentContext.model_validate(payload)
        except FileNotFoundError as exc:
            raise IncidentProviderError(f"Mock fixture not found: {self.fixture_path}") from exc
        except (json.JSONDecodeError, ValueError) as exc:
            raise IncidentProviderError(f"Mock fixture is invalid: {exc}") from exc
        if context.incident.incident_id != incident_id:
            raise IncidentNotFoundError(f"Incident {incident_id} was not found")
        return context
