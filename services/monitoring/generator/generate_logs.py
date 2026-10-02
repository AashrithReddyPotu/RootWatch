"""Send synthetic traffic to the running API, in either storage mode."""
import argparse
import json
import random
import time
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from uuid import uuid4

def post(base, path, payload):
    request = Request(base.rstrip('/') + path, json.dumps(payload).encode(), {'Content-Type': 'application/json'}, method='POST')
    with urlopen(request, timeout=30) as response:
        return json.load(response)

def batch(rng, tick, size=12, scenario='recurring'):
    # Each 60-tick cycle: 10 healthy ticks, 20 faulty ticks, then recovery.
    faulty = scenario == 'incident' or (scenario == 'recurring' and 10 <= tick % 60 < 30)
    rows = []
    for index in range(size):
        endpoint = ['/careers', '/jobs', '/profile', '/api/applications'][index % 4]
        failure = endpoint == '/api/applications' and faulty and rng.random() < 0.9
        rows.append({'id': str(uuid4()), 'timestamp': datetime.now(timezone.utc).isoformat(),
            'service': 'careers-backend', 'endpoint': endpoint,
            'method': 'POST' if endpoint == '/api/applications' else 'GET',
            'status_code': 500 if failure else 200, 'latency_ms': rng.randint(700, 1500) if failure else rng.randint(25, 180),
            'error_type': 'DATABASE_CONNECTION_TIMEOUT' if failure else None,
            'error_message': 'Connection pool exhausted; database connection timed out' if failure else None,
            'deployment_version': 'v1.4.8', 'request_id': str(uuid4())})
    return rows

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8000')
    parser.add_argument('--interval', type=float, default=5)
    parser.add_argument('--batches', type=int, default=0, help='0 means run continuously')
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--scenario', choices=['healthy', 'incident', 'recurring'], default='recurring')
    args = parser.parse_args()
    if args.interval <= 0 or args.batches < 0:
        parser.error('interval must be positive; batches must be nonnegative')
    post(args.url, '/deployments', {'deployment_version': 'v1.4.8',
        'deployed_at': datetime.now(timezone.utc).isoformat(), 'commit_hash': 'demo148',
        'files_changed': ['services/application_service.py', 'database/connection.py'],
        'description': 'Synthetic deployment metadata; no source-code analysis'})
    rng = random.Random(args.seed)
    tick = 0
    try:
        while args.batches == 0 or tick < args.batches:
            print(f'batch {tick}: {post(args.url, "/logs", batch(rng, tick, scenario=args.scenario))}', flush=True)
            tick += 1
            if args.batches == 0 or tick < args.batches:
                time.sleep(args.interval)
    except KeyboardInterrupt:
        print('Generator stopped')

if __name__ == '__main__':
    main()
