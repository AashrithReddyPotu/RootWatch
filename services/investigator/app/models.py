from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class Severity(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IncidentStatus(StrEnum):
    active = "active"
    resolved = "resolved"


class ClaimType(StrEnum):
    fact = "fact"
    inference = "inference"
    recommendation = "recommendation"


class Incident(BaseModel):
    incident_id: str
    service: str
    endpoint: str
    method: str
    error_type: str
    severity: Severity
    status: IncidentStatus
    started_at: datetime
    last_seen_at: datetime
    occurrence_count: int = Field(ge=0)
    failure_rate: float = Field(ge=0, le=1)


class IncidentLog(BaseModel):
    log_id: str
    timestamp: datetime
    request_id: str
    status_code: int
    latency_ms: float = Field(ge=0)
    error_type: str | None = None
    message: str | None = None


class Deployment(BaseModel):
    version: str
    deployed_at: datetime
    commit_hash: str
    files_changed: list[str] = Field(default_factory=list)


class Statistics(BaseModel):
    window_minutes: int = Field(gt=0)
    total_requests: int = Field(ge=0)
    failed_requests: int = Field(ge=0)
    average_latency_ms: float = Field(ge=0)


class IncidentContext(BaseModel):
    incident: Incident
    recent_logs: list[IncidentLog] = Field(default_factory=list)
    deployment: Deployment | None = None
    statistics: Statistics


class ChatRequest(BaseModel):
    incident_id: str = Field(min_length=1, max_length=128)
    message: str = Field(min_length=1, max_length=4000)

    @field_validator("incident_id", "message")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class EvidenceItem(BaseModel):
    id: str
    label: str
    source: str


class CodeLocation(BaseModel):
    path: str
    function: str | None = None
    line: int | None = Field(default=None, ge=1)
    reason: str
    snippet: str | None = None


class Claim(BaseModel):
    type: ClaimType
    text: str
    evidence_ids: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    incident_id: str
    intent: str
    answer: str
    claims: list[Claim]
    evidence: list[EvidenceItem]
    code_locations: list[CodeLocation]
    confidence: float = Field(ge=0, le=1)
    model_used: str | None = None


class HealthResponse(BaseModel):
    status: str
    service: str
    incident_provider: str
    llm_enabled: bool


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
