from datetime import timedelta
from fastapi.testclient import TestClient
from app.config import utcnow
from app.detection.incident_detector import detect
from app.main import create_app
from app.models import ServerLog
from app.repositories import MockStore


def log(n, now, status=500, endpoint='/api/applications', service='backend', method='POST'):
    return ServerLog(id=str(n), timestamp=now-timedelta(seconds=10), service=service,
        endpoint=endpoint, method=method, status_code=status, latency_ms=100,
        error_type='DATABASE_CONNECTION_TIMEOUT' if status >= 500 else None,
        deployment_version='v1', request_id=str(n))


def test_count_dedup_resolution_and_recurrence():
    now = utcnow()
    store = MockStore()
    store.insert_logs([log(n, now) for n in range(4)])
    detect(store, now)
    assert not store.list_incidents()
    store.insert_logs([log(4, now)])
    detect(store, now)
    incident = store.list_incidents()[0]
    assert incident.occurrence_count == 5
    store.insert_logs([log(4, now)])
    detect(store, now)
    assert len(store.list_incidents()) == 1
    assert store.list_incidents()[0].occurrence_count == 5
    later = now + timedelta(seconds=131)
    detect(store, later)
    assert store.list_incidents()[0].status == 'resolved'
    store.insert_logs([log(100+n, later) for n in range(5)])
    detect(store, later)
    assert len(store.list_incidents()) == 2
    assert sum(i.status == 'active' for i in store.list_incidents()) == 1


def test_rate_threshold_and_problem_isolation():
    now = utcnow()
    store = MockStore()
    store.insert_logs([log(n, now, 500 if n < 3 else 200) for n in range(10)])
    detect(store, now)
    assert not store.list_incidents()  # exactly 30% does not exceed threshold
    store.insert_logs([log(10, now)])
    detect(store, now)
    assert len(store.list_incidents()) == 1  # four errors qualifies via rate
    store.insert_logs([log(20+n, now, service='other') for n in range(5)])
    detect(store, now)
    assert len(store.list_incidents()) == 2


def test_api_contract_and_filters():
    store = MockStore(seed=True, now=utcnow())
    with TestClient(create_app(store)) as client:
        assert client.get('/health').json()['storage'] == 'mock'
        incidents = client.get('/incidents').json()
        assert len(incidents) == 1
        identifier = incidents[0]['incident_id']
        for path in ['/logs/recent', '/incidents', f'/incidents/{identifier}',
                     f'/incidents/{identifier}/logs', '/deployments/recent',
                     '/analytics/error-frequency', f'/investigation/context/{identifier}']:
            assert client.get(path).status_code == 200, path
        payload = client.get(f'/investigation/context/{identifier}?limit=2').json()
        assert set(payload) == {'incident', 'recent_logs', 'deployment', 'statistics'}
        assert len(payload['recent_logs']) == 2
        assert payload['statistics']['total_requests'] > 2
        assert payload['statistics']['failed_requests'] == 10
        assert payload['deployment']['deployment_version'] == 'v1.4.8'
        assert client.get('/incidents/missing').status_code == 404
        assert client.get('/investigation/context/missing').status_code == 404
        assert client.get('/logs/recent?limit=0').status_code == 422
        assert client.get('/analytics/error-frequency?minutes=0').status_code == 422
        assert client.get('/logs/recent?endpoint=/jobs').json()[0]['endpoint'] == '/jobs'
        stats = client.get('/analytics/error-frequency?endpoint=/api/applications&error_type=unknown').json()
        assert stats['matching_errors'] == 0 and stats['failed_requests'] == 10
        assert client.post('/logs', json=[]).status_code == 422
        new = log(900, utcnow()).model_dump(mode='json')
        others = [log(901+n, utcnow()).model_dump(mode='json') for n in range(4)]
        assert client.post('/logs', json=others).status_code == 200
        assert client.post('/logs', json=[new]).status_code == 200
        assert client.post('/logs', json=[new]).status_code == 200
        assert client.get(f'/incidents/{identifier}').json()['occurrence_count'] == 10
        assert len(client.get('/incidents').json()) == 2  # distinct service
        new['timestamp'] = '2026-10-02T20:00:00'  # timezone required
        assert client.post('/logs', json=[new]).status_code == 422


def test_no_cross_endpoint_counts_or_old_errors():
    now = utcnow()
    store = MockStore()
    rows = [log(n, now, endpoint='/a' if n < 3 else '/b') for n in range(6)]
    rows += [log(20+n, now-timedelta(minutes=5)) for n in range(10)]
    store.insert_logs(rows)
    detect(store, now)
    assert not store.list_incidents()
