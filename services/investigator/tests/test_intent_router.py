from app.investigation.intent_router import InvestigationIntent, IntentRouter


def test_routes_code_question():
    assert IntentRouter().route("Where in the code is this failing?") == InvestigationIntent.code_location


def test_routes_cause_question():
    assert IntentRouter().route("Why are applications failing?") == InvestigationIntent.cause


def test_defaults_to_summary():
    assert IntentRouter().route("What is happening?") == InvestigationIntent.summary
