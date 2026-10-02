from database.connection import get_connection


def validate_application(data: dict) -> None:
    if not data.get("email"):
        raise ValueError("Email is required")


def submit_application(data: dict) -> dict:
    connection = get_connection()
    validate_application(data)
    result = connection.execute(
        "insert into applications(email, role) values (:email, :role)",
        {"email": data["email"], "role": data.get("role")},
    )
    connection.close()
    return result
