from services.application_service import submit_application


def create_application(payload: dict) -> dict:
    return submit_application(payload)
