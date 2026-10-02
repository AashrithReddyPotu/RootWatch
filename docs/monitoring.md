# Monitoring — Person 1

Implementation and exact setup/run/test commands: [service README](../services/monitoring/README.md).

The monitoring service runs independently on port 8000. Person 2 consumes `GET /investigation/context/{incident_id}`. Person 3 can call the incident, log, deployment and analytics APIs directly.

- [Monitoring OpenAPI contract](../contracts/monitoring-api.yaml) (OpenAPI JSON, valid YAML).
- [Incident list fixture](../contracts/examples/incidents.json).
- [Investigation context fixture](../contracts/examples/investigation-context.json).

Shared contracts are initially generated from the implemented API and its typed response models. Coordinate any subsequent changes with the team. Never hardcode an incident ID; fetch `/incidents` first. Fixture dates are static; the service-local seeded dataset rebases all dates to the present at startup. Context deployment uses `deployment_version`, messages use `error_message`, and rates are fractions.

Owned paths: `services/monitoring/`, `contracts/monitoring-api.yaml`, the two monitoring examples, and this document. Root configuration, investigator files, frontend files and the existing LICENSE are outside Person 1 ownership.

The detector uses a 120-second window, at least five matching 5xx errors or greater than 30% endpoint failure rate with at least ten requests. It updates active problems, resolves quiet ones, and creates a fresh incident on recurrence. It uses no AI functionality.
