from datetime import datetime
from typing import Literal
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator

class ServerLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    timestamp: datetime
    service: str = Field(default='careers-backend', min_length=1)
    endpoint: str = Field(min_length=1)
    method: Literal['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
    status_code: int = Field(ge=100, le=599)
    latency_ms: float = Field(ge=0)
    error_type: str | None = None
    error_message: str | None = None
    deployment_version: str = Field(min_length=1)
    request_id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)

    @field_validator('timestamp')
    @classmethod
    def aware(cls, value):
        if value.tzinfo is None:
            raise ValueError('timestamp must include a UTC offset')
        return value

class Deployment(BaseModel):
    deployment_version: str = Field(min_length=1)
    deployed_at: datetime
    commit_hash: str
    files_changed: list[str]
    description: str

    @field_validator('deployed_at')
    @classmethod
    def aware(cls, value):
        if value.tzinfo is None:
            raise ValueError('deployed_at must include a UTC offset')
        return value

class Incident(BaseModel):
    incident_id: str
    service: str
    endpoint: str
    method: str
    error_type: str
    status: Literal['active', 'resolved']
    start_time: datetime
    last_seen: datetime
    occurrence_count: int
    failure_rate: float
    severity: Literal['medium', 'high']
    deployment_version: str

class Statistics(BaseModel):
    window_start: datetime
    window_end: datetime
    total_requests: int
    failed_requests: int
    failure_rate: float
    average_latency_ms: float
    error_counts: dict[str, int]

class Context(BaseModel):
    incident: Incident
    recent_logs: list[ServerLog]
    deployment: Deployment | None
    statistics: Statistics
