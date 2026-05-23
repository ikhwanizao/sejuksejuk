import json
from .models import AuditLog


def record_action(actor, action: str, target=None, payload: dict = None):
    """Write an audit log entry. Fire-and-forget; never raises."""
    try:
        target_type = type(target).__name__ if target else ""
        target_id = str(getattr(target, "pk", "") or "")
        AuditLog.objects.create(
            actor=actor,
            action=action,
            target_type=target_type,
            target_id=target_id,
            payload_json=json.dumps(payload or {}),
        )
    except Exception:
        pass
