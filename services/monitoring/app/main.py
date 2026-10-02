"""Application wiring only; routes and data services are independently readable."""
import logging
import os
from contextlib import asynccontextmanager
from threading import Event, Thread
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import enabled, utcnow
from .repositories import MockStore, SnowflakeStore
from .services.monitor import Monitor
from .api import health, logs, incidents, investigation

logger = logging.getLogger('rootwatch')

def create_app(store=None):
    @asynccontextmanager
    async def lifespan(api):
        selected = store if store is not None else (MockStore(enabled('MOCK_SEED'), utcnow()) if enabled('MOCK_MODE') else SnowflakeStore())
        monitor = Monitor(selected)
        api.state.monitor = monitor
        monitor.tick()
        stop = Event()
        def worker():
            while not stop.wait(5):
                try:
                    monitor.tick()
                except Exception:
                    monitor.detector_error = 'Detection unavailable'
                    logger.exception('Incident detection failed')
        thread = Thread(target=worker, daemon=True)
        thread.start()
        try:
            yield
        finally:
            stop.set()
            thread.join(timeout=6)

    api = FastAPI(title='RootWatch Monitoring API', version='1.0.0', lifespan=lifespan)
    api.add_middleware(CORSMiddleware, allow_origins=os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(','), allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])
    for routes in (health, logs, incidents, investigation):
        api.include_router(routes.router)
    return api

app = create_app()
