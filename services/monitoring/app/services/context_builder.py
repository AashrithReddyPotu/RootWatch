from collections import Counter
from ..config import utcnow
from ..models import Context, Statistics

def build_context(m, incident_id, limit):
    row = m.incident(incident_id)
    end = utcnow() if row.status == 'active' else row.last_seen
    logs = m.related(row, end)
    deployments = m.store.list_deployments()
    dep = next((d for d in deployments if d.deployment_version == row.deployment_version and d.deployed_at <= row.start_time), None)
    failed = [r for r in logs if r.status_code >= 500]
    stats = Statistics(window_start=row.start_time, window_end=end, total_requests=len(logs),
        failed_requests=len(failed), failure_rate=len(failed) / len(logs) if logs else 0.0,
        average_latency_ms=sum(r.latency_ms for r in logs) / len(logs) if logs else 0.0,
        error_counts=dict(Counter(r.error_type or 'HTTP_5XX' for r in failed)))
    return Context(incident=row, recent_logs=logs[:limit], deployment=dep, statistics=stats)
