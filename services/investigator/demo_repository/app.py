from routes.careers import create_application


def handle_application(payload: dict) -> dict:
    return create_application(payload)
