import logging
from fastapi import APIRouter, HTTPException, Request
from ..repositories import MockStore

logger = logging.getLogger('rootwatch')
router = APIRouter()

@router.get('/health')
def health(request: Request):
    m = request.app.state.monitor
    try:
        m.store.ping()
    except Exception:
        logger.exception('Storage health check failed')
        raise HTTPException(503, 'Storage unavailable')
    if m.detector_error:
        raise HTTPException(503, m.detector_error)
    return {'status': 'ok', 'storage': 'mock' if isinstance(m.store, MockStore) else 'snowflake'}
