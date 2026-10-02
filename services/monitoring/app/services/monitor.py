from threading import RLock
from fastapi import HTTPException
from ..config import utcnow
from ..detection.incident_detector import detect

class Monitor:
    def __init__(self, store):
        self.store = store
        self.lock = RLock()
        self.detector_error = None

    def tick(self):
        with self.lock:
            detect(self.store, utcnow())
            self.detector_error = None

    def incident(self, identifier):
        row = next((r for r in self.store.list_incidents() if r.incident_id == identifier), None)
        if row is None:
            raise HTTPException(404, 'Incident not found')
        return row

    def related(self, incident, until, limit=None):
        return self.store.query_logs(incident.start_time, until, service=incident.service,
            endpoint=incident.endpoint, method=incident.method, limit=limit)
