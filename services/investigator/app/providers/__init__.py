from app.config import Settings
from app.providers.api_incident_provider import APIIncidentProvider
from app.providers.base import IncidentProvider
from app.providers.mock_incident_provider import MockIncidentProvider


def create_incident_provider(settings: Settings) -> IncidentProvider:
    if settings.incident_provider == "api":
        return APIIncidentProvider(settings.monitoring_api_url)
    return MockIncidentProvider(settings.mock_incident_path)


__all__ = ["IncidentProvider", "create_incident_provider"]
