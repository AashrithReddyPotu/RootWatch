from app.code_search import CodeSearcher
from app.config import Settings
from app.investigation.evidence_builder import EvidenceBuilder
from app.investigation.intent_router import InvestigationIntent, IntentRouter
from app.investigation.prompts import SYSTEM_PROMPT, build_user_prompt
from app.llm.client import LLMError, OllamaClient
from app.models import ChatRequest, ChatResponse, IncidentContext
from app.providers.base import IncidentProvider


class Investigator:
    def __init__(self, settings: Settings, provider: IncidentProvider):
        self.settings = settings
        self.provider = provider
        self.router = IntentRouter()
        self.searcher = CodeSearcher(settings.source_root)
        self.evidence_builder = EvidenceBuilder()
        self.llm = OllamaClient(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
            timeout_seconds=settings.llm_timeout_seconds,
            enabled=settings.use_llm,
        )

    async def investigate(self, request: ChatRequest) -> ChatResponse:
        context = await self.provider.get_context(request.incident_id)
        intent = self.router.route(request.message)
        matches = self._find_code(context, request.message, intent)
        evidence, claims, locations = self.evidence_builder.build(context, matches)
        prompt = build_user_prompt(request.message, intent.value, context, evidence, claims, locations)
        answer = None
        model_used = None
        try:
            answer = await self.llm.generate(SYSTEM_PROMPT, prompt)
            if answer:
                model_used = self.settings.ollama_model
        except LLMError:
            if self.settings.llm_required:
                raise
        if not answer:
            answer = self._fallback_answer(intent, context, locations)
        confidence = self._confidence(context, locations)
        return ChatResponse(
            incident_id=request.incident_id,
            intent=intent.value,
            answer=answer,
            claims=claims,
            evidence=evidence,
            code_locations=locations,
            confidence=confidence,
            model_used=model_used,
        )

    def _find_code(
        self,
        context: IncidentContext,
        message: str,
        intent: InvestigationIntent,
    ):
        if intent not in {
            InvestigationIntent.cause,
            InvestigationIntent.code_location,
            InvestigationIntent.remediation,
        }:
            return []
        error_messages = " ".join(log.message or "" for log in context.recent_logs[:10])
        query = f"{message} {context.incident.error_type} {context.incident.endpoint} {error_messages}"
        preferred = context.deployment.files_changed if context.deployment else []
        return self.searcher.search(query, preferred_files=preferred, limit=4)

    @staticmethod
    def _fallback_answer(intent: InvestigationIntent, context: IncidentContext, locations) -> str:
        incident = context.incident
        stats = context.statistics
        summary = (
            f"{incident.method} {incident.endpoint} is experiencing {incident.error_type}. "
            f"{stats.failed_requests} of {stats.total_requests} requests failed in the last "
            f"{stats.window_minutes} minutes ({incident.failure_rate:.0%})."
        )
        if intent == InvestigationIntent.timeline and context.deployment:
            delta = incident.started_at - context.deployment.deployed_at
            minutes = max(0, round(delta.total_seconds() / 60))
            return f"{summary} The incident began about {minutes} minutes after deployment {context.deployment.version}."
        if intent == InvestigationIntent.code_location and locations:
            first = locations[0]
            function = f" in {first.function}()" if first.function else ""
            return f"Start with {first.path}{function} near line {first.line}. It is the strongest source match for the observed failure."
        if intent == InvestigationIntent.remediation:
            target = locations[0].path if locations else "the database access path"
            return f"{summary} Inspect {target}, guarantee connection cleanup with a context manager or finally block, and verify the pool recovers after exceptions."
        if intent == InvestigationIntent.cause:
            target = locations[0].path if locations else "the database connection path"
            return f"{summary} The evidence most strongly suggests exhausted or unreleased database connections associated with {target}. This is an inference, not a confirmed cause."
        return summary

    @staticmethod
    def _confidence(context: IncidentContext, locations) -> float:
        score = 0.45
        if context.recent_logs:
            score += 0.12
        if context.deployment:
            score += 0.12
        if locations:
            score += 0.16
        if context.statistics.failed_requests >= 5:
            score += 0.08
        return min(round(score, 2), 0.95)
