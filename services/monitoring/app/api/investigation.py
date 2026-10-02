from fastapi import APIRouter, Query, Request
from ..models import Context
from ..services.context_builder import build_context

router = APIRouter()

@router.get('/investigation/context/{incident_id}', response_model=Context)
def context(request: Request, incident_id: str, limit: int = Query(100, ge=1, le=1000)):
    m = request.app.state.monitor
    with m.lock:
        return build_context(m, incident_id, limit)
