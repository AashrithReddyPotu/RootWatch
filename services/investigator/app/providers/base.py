from abc import ABC, abstractmethod

from app.models import IncidentContext


class IncidentProviderError(RuntimeError):
    pass


class IncidentNotFoundError(IncidentProviderError):
    pass


class IncidentProvider(ABC):
    @abstractmethod
    async def get_context(self, incident_id: str) -> IncidentContext:
        raise NotImplementedError

    async def close(self) -> None:
        return None
