import json

from app.models import Claim, CodeLocation, EvidenceItem, IncidentContext


SYSTEM_PROMPT = """You are RootWatch, an incident investigation assistant.
Use only the supplied evidence. Clearly separate facts from inferences and recommendations.
Do not invent logs, deployments, files, functions, line numbers, or causes.
If evidence is incomplete, say so. Return a concise answer suitable for an engineer.
"""


def build_user_prompt(
    message: str,
    intent: str,
    context: IncidentContext,
    evidence: list[EvidenceItem],
    claims: list[Claim],
    locations: list[CodeLocation],
) -> str:
    payload = {
        "question": message,
        "intent": intent,
        "incident": context.incident.model_dump(mode="json"),
        "statistics": context.statistics.model_dump(mode="json"),
        "deployment": context.deployment.model_dump(mode="json") if context.deployment else None,
        "evidence": [item.model_dump(mode="json") for item in evidence],
        "draft_claims": [item.model_dump(mode="json") for item in claims],
        "code_locations": [item.model_dump(mode="json") for item in locations],
    }
    return "Answer the engineer's question using this evidence package:\n" + json.dumps(payload, indent=2)
