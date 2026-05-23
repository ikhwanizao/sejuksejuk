from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    detail = response.data
    # Normalise to {detail, code, errors}
    if isinstance(detail, dict) and "detail" not in detail:
        payload = {"detail": "Validation error.", "code": "validation_error", "errors": detail}
    elif isinstance(detail, list):
        payload = {"detail": "Validation error.", "code": "validation_error", "errors": detail}
    else:
        code = getattr(getattr(exc, "detail", exc), "code", "error")
        message = detail.get("detail", str(detail)) if isinstance(detail, dict) else str(detail)
        payload = {"detail": message, "code": code, "errors": {}}

    response.data = payload
    return response
