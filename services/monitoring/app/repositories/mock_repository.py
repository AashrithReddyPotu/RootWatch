"""Small interchangeable stores. SQL values are always parameterized."""
import json
import os
from ..config import ROOT, parse_time
from ..models import ServerLog, Deployment, Incident
from .base import Repository

class MockStore(Repository):
    def __init__(self, seed=False, now=None):
        self.logs = {}
        self.incidents = {}
        self.deployments = {}
        if seed:
            data = json.loads((ROOT / 'mock_data/mock_dataset.json').read_text())
            # Rebase fixture timestamps together so a fresh demo has a live incident.
            anchor = parse_time(data['anchor_time'])
            shift = now - anchor
            for row in data['deployments']:
                row['deployed_at'] = parse_time(row['deployed_at']) + shift
                self.save_deployment(Deployment(**row))
            for row in data['logs']:
                row['timestamp'] = parse_time(row['timestamp']) + shift
                self.insert_logs([ServerLog(**row)])

    def ping(self):
        return True

    def insert_logs(self, rows):
        for row in rows:
            self.logs.setdefault(row.id, row)

    def query_logs(self, since, until, service=None, endpoint=None, method=None, error_type=None, limit=None):
        rows = [r for r in self.logs.values() if since <= r.timestamp <= until
                and all(v is None or getattr(r, k) == v for k, v in
                        [('service', service), ('endpoint', endpoint), ('method', method), ('error_type', error_type)])]
        rows.sort(key=lambda r: (r.timestamp, r.id), reverse=True)
        return rows if limit is None else rows[:limit]

    def list_incidents(self):
        return sorted(self.incidents.values(), key=lambda i: (i.last_seen, i.incident_id), reverse=True)

    def save_incident(self, row):
        self.incidents[row.incident_id] = row

    def save_deployment(self, row):
        self.deployments[row.deployment_version] = row

    def list_deployments(self):
        return sorted(self.deployments.values(), key=lambda d: d.deployed_at, reverse=True)
