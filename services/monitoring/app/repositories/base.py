"""Minimal contract shared by storage adapters; API behavior is backend-independent."""
from abc import ABC, abstractmethod
from datetime import datetime
from ..models import ServerLog, Incident, Deployment

class Repository(ABC):
    @abstractmethod
    def ping(self) -> bool: ...

    @abstractmethod
    def insert_logs(self, rows: list[ServerLog]) -> None: ...

    @abstractmethod
    def query_logs(self, since: datetime, until: datetime, service=None, endpoint=None,
                   method=None, error_type=None, limit=None) -> list[ServerLog]: ...

    @abstractmethod
    def list_incidents(self) -> list[Incident]: ...

    @abstractmethod
    def save_incident(self, row: Incident) -> None: ...

    @abstractmethod
    def save_deployment(self, row: Deployment) -> None: ...

    @abstractmethod
    def list_deployments(self) -> list[Deployment]: ...
