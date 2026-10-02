from collections import Counter

from app.code_search import CodeMatch
from app.models import Claim, ClaimType, CodeLocation, EvidenceItem, IncidentContext


class EvidenceBuilder:
    def build(
        self,
        context: IncidentContext,
        code_matches: list[CodeMatch],
    ) -> tuple[list[EvidenceItem], list[Claim], list[CodeLocation]]:
        stats = context.statistics
        incident = context.incident
        evidence = [
            EvidenceItem(
                id="STAT-failure-rate",
                label=f"{stats.failed_requests} of {stats.total_requests} requests failed in the last {stats.window_minutes} minutes",
                source="monitoring_statistics",
            ),
            EvidenceItem(
                id="INC-error-type",
                label=f"The incident is classified as {incident.error_type} on {incident.method} {incident.endpoint}",
                source="incident",
            ),
        ]
        claims = [
            Claim(
                type=ClaimType.fact,
                text=f"The endpoint has a {incident.failure_rate:.0%} failure rate.",
                evidence_ids=["STAT-failure-rate"],
            )
        ]
        error_counts = Counter(log.error_type for log in context.recent_logs if log.error_type)
        if error_counts:
            error_type, count = error_counts.most_common(1)[0]
            evidence.append(
                EvidenceItem(
                    id="LOG-dominant-error",
                    label=f"{error_type} is the dominant sampled error, appearing {count} times",
                    source="recent_logs",
                )
            )
        if context.deployment:
            delta = incident.started_at - context.deployment.deployed_at
            minutes = max(0, round(delta.total_seconds() / 60))
            evidence.append(
                EvidenceItem(
                    id=f"DEP-{context.deployment.version}",
                    label=f"Incident activity began about {minutes} minutes after deployment {context.deployment.version}",
                    source="deployment",
                )
            )
        locations = []
        for index, match in enumerate(code_matches, start=1):
            evidence_id = f"CODE-{index:03d}"
            evidence.append(
                EvidenceItem(
                    id=evidence_id,
                    label=f"Relevant source match in {match.path} at line {match.line}",
                    source="source_code",
                )
            )
            locations.append(
                CodeLocation(
                    path=match.path,
                    function=match.function,
                    line=match.line,
                    reason="Matches the incident error, user question, or a file changed by the latest deployment.",
                    snippet=match.snippet,
                )
            )
        inference_ids = [item.id for item in evidence if item.id.startswith(("LOG-", "DEP-", "CODE-"))]
        if inference_ids:
            claims.append(
                Claim(
                    type=ClaimType.inference,
                    text="The failure is likely connected to the recent deployment and the matching database-handling code.",
                    evidence_ids=inference_ids,
                )
            )
        if locations:
            claims.append(
                Claim(
                    type=ClaimType.recommendation,
                    text=f"Inspect {locations[0].path} first and verify that resources are released on every error path.",
                    evidence_ids=["CODE-001"],
                )
            )
        return evidence, claims, locations
