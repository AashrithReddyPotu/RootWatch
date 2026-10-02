from collections import Counter
from datetime import timedelta
from fastapi import APIRouter, HTTPException, Query, Request
from ..config import utcnow
from ..models import ServerLog
from ..detection.incident_detector import detect

router = APIRouter()

@router.post('/logs', response_model=dict)
def ingest(request: Request, rows: list[ServerLog]):
    if not 1 <= len(rows) <= 1000:
        raise HTTPException(422, 'Send between 1 and 1000 logs')
    now = utcnow()
    if any(r.timestamp > now for r in rows):
        raise HTTPException(422, 'Future timestamps are not accepted')
    m = request.app.state.monitor
    with m.lock:
        m.store.insert_logs(rows)
        detect(m.store, now)
    return {'accepted': len(rows)}

@router.get('/logs/recent', response_model=list[ServerLog])
def recent_logs(request: Request, minutes: int = Query(10, ge=1, le=1440), limit: int = Query(100, ge=1, le=1000), endpoint: str | None = None, error_type: str | None = None):
    now = utcnow()
    m = request.app.state.monitor
    with m.lock:
        return m.store.query_logs(now - timedelta(minutes=minutes), now, endpoint=endpoint, error_type=error_type, limit=limit)

@router.get('/analytics/error-frequency')
def frequency(request: Request, endpoint: str | None = None, error_type: str | None = None, minutes: int = Query(10, ge=1, le=1440)):
    now = utcnow()
    start = now - timedelta(minutes=minutes)
    m = request.app.state.monitor
    with m.lock:
        rows = m.store.query_logs(start, now, endpoint=endpoint)
    failed = [r for r in rows if r.status_code >= 500]
    matching = [r for r in failed if error_type is None or (r.error_type or 'HTTP_5XX') == error_type]
    counts = Counter((r.service, r.method, r.endpoint, r.error_type or 'HTTP_5XX') for r in matching)
    return {'window_start': start, 'window_end': now, 'total_requests': len(rows),
        'failed_requests': len(failed), 'matching_errors': len(matching),
        'failure_rate': len(failed) / len(rows) if rows else 0.0,
        'groups': [{'service': k[0], 'method': k[1], 'endpoint': k[2], 'error_type': k[3], 'count': v} for k, v in sorted(counts.items())]}
