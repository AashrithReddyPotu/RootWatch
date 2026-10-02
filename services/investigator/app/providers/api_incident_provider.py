import httpx

from app.models import IncidentContext
from app.providers.base import IncidentNotFoundError, IncidentProvider, IncidentProviderError


class APIIncidentProvider(IncidentProvider):
    def __init__(self, base_url: str, timeout_seconds: float = 15.0):
        self.client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=timeout_seconds,
        )

    async def get_context(self, incident_id: str) -> IncidentContext:
        try:
            response = await self.client.get(f"/investigation/context/{incident_id}")
        except httpx.HTTPError as exc:
            raise IncidentProviderError(f"Monitoring API request failed: {exc}") from exc
        if response.status_code == 404:
            raise IncidentNotFoundError(f"Incident {incident_id} was not found")
        try:
            response.raise_for_status()
            return IncidentContext.model_validate(response.json())
        except (httpx.HTTPError, ValueError) as exc:
            raise IncidentProviderError(f"Monitoring API returned invalid data: {exc}") from exc

    async def close(self) -> None:
        await self.client.aclose()
