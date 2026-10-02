"""Export local examples. Shared-boundary updates require intentional opt-in."""
import argparse
import json
from fastapi.testclient import TestClient
from .config import ROOT, utcnow
from .main import create_app
from .models import Context
from .repositories import MockStore

def save(path, payload):
    path.write_text(json.dumps(payload, indent=2) + '\n')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--update-contracts', action='store_true',
                        help='Update team boundary files; coordinate changes with the team')
    args = parser.parse_args()
    api = create_app(MockStore(seed=True, now=utcnow()))
    with TestClient(api) as client:
        incidents = client.get('/incidents').json()
        response = client.get('/investigation/context/' + incidents[0]['incident_id'])
        response.raise_for_status()
        context = response.json()
        save(ROOT / 'mock_data/incidents.json', incidents)
        save(ROOT / 'mock_data/investigation-context.json', context)
        save(ROOT / 'mock_data/investigation-context.schema.json', Context.model_json_schema())
        if args.update_contracts:
            contracts = ROOT.parents[1] / 'contracts'
            save(contracts / 'examples/incidents.json', incidents)
            save(contracts / 'examples/investigation-context.json', context)
            # JSON is a YAML subset, supported by OpenAPI tooling without extra dependencies.
            save(contracts / 'monitoring-api.yaml', api.openapi())
    print('Saved monitoring fixtures' + (' and shared contracts' if args.update_contracts else ''))

if __name__ == '__main__':
    main()
