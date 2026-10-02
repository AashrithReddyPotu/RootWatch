from fastapi import APIRouter, Query, Request
from ..config import utcnow
from ..models import Deployment, Incident, ServerLog

router = APIRouter()

@router.post('/deployments', response_model=Deployment)
def deployment(request: Request, row: Deployment):
    m = request.app.state.monitor
    with m.lock:
        m.store.save_deployment(row)
    return row

@router.get('/incidents', response_model=list[Incident])
def incidents(request: Request, status: str | None = Query(None, pattern='^(active|resolved)$'), limit: int = Query(100, ge=1, le=1000)):
    m = request.app.state.monitor
    with m.lock:
        return [r for r in m.store.list_incidents() if status is None or r.status == status][:limit]

@router.get('/incidents/{incident_id}', response_model=Incident)
def incident(request: Request, incident_id: str):
    m = request.app.state.monitor
    with m.lock:
        return m.incident(incident_id)

@router.get('/incidents/{incident_id}/logs', response_model=list[ServerLog])
def incident_logs(request: Request, incident_id: str, limit: int = Query(100, ge=1, le=1000)):
    m = request.app.state.monitor
    with m.lock:
        row = m.incident(incident_id)
        end = utcnow() if row.status == 'active' else row.last_seen
        return m.related(row, end, limit)

@router.get('/deployments/recent', response_model=list[Deployment])
def deployments(request: Request, limit: int = Query(10, ge=1, le=100)):
    m = request.app.state.monitor
    with m.lock:
        return m.store.list_deployments()[:limit]
