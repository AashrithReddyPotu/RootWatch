from enum import StrEnum


class InvestigationIntent(StrEnum):
    summary = "summary"
    timeline = "timeline"
    cause = "cause"
    code_location = "code_location"
    remediation = "remediation"


class IntentRouter:
    RULES = {
        InvestigationIntent.remediation: {
            "fix", "resolve", "remediate", "solution", "prevent", "change", "recommend"
        },
        InvestigationIntent.code_location: {
            "where", "file", "code", "function", "line", "source", "location"
        },
        InvestigationIntent.timeline: {
            "when", "start", "began", "timeline", "deployment", "deploy", "before", "after"
        },
        InvestigationIntent.cause: {
            "why", "cause", "causing", "root", "reason", "failing", "failure", "broken"
        },
    }

    def route(self, message: str) -> InvestigationIntent:
        words = {word.strip(".,?!:;()[]{}").lower() for word in message.split()}
        for intent, keywords in self.RULES.items():
            if words & keywords:
                return intent
        return InvestigationIntent.summary
