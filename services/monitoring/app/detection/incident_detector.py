"""Pure deterministic rules, run under the service lock."""
from collections import defaultdict
from datetime import timedelta
from uuid import uuid5, NAMESPACE_URL
from ..models import Incident

WINDOW_SECONDS = 120
MIN_FAILURES = 5
MIN_REQUESTS_FOR_RATE = 10
RATE_THRESHOLD = 0.30

def key(row):
    return row.service, row.method, row.endpoint, row.error_type or 'HTTP_5XX'

def detect(store, now):
    rows = store.query_logs(now - timedelta(seconds=WINDOW_SECONDS), now)
    endpoints = defaultdict(list)
    failures = defaultdict(list)
    for row in rows:
        endpoints[(row.service, row.method, row.endpoint)].append(row)
        if row.status_code >= 500:
            failures[key(row)].append(row)
    active = {key(i): i for i in store.list_incidents() if i.status == 'active'}
    for problem, errors in sorted(failures.items()):
        traffic = endpoints[problem[:3]]
        failed = sum(r.status_code >= 500 for r in traffic)
        rate = failed / len(traffic)
        previous = active.get(problem)
        if previous is None and not (len(errors) >= MIN_FAILURES or
                (len(traffic) >= MIN_REQUESTS_FOR_RATE and rate > RATE_THRESHOLD)):
            continue
        first = min(errors, key=lambda r: (r.timestamp, r.id))
        latest = max(errors, key=lambda r: (r.timestamp, r.id))
        start = previous.start_time if previous else first.timestamp
        identifier = previous.incident_id if previous else 'INC-' + uuid5(NAMESPACE_URL, '|'.join(problem) + start.isoformat()).hex[:12]
        history = store.query_logs(start, now, service=problem[0], method=problem[1], endpoint=problem[2])
        count = sum(r.status_code >= 500 and (r.error_type or 'HTTP_5XX') == problem[3] for r in history)
        store.save_incident(Incident(incident_id=identifier, service=problem[0], method=problem[1], endpoint=problem[2],
            error_type=problem[3], status='active', start_time=start, last_seen=latest.timestamp,
            occurrence_count=count, failure_rate=rate, severity='high' if rate >= 0.5 else 'medium',
            deployment_version=previous.deployment_version if previous else first.deployment_version))
    for problem, incident in active.items():
        if problem not in failures and (now - incident.last_seen).total_seconds() >= WINDOW_SECONDS:
            store.save_incident(incident.model_copy(update={'status': 'resolved', 'failure_rate': 0.0}))
