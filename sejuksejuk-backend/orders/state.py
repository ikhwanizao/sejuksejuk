from rest_framework.exceptions import ValidationError

# Allowed transitions: current_status -> set of valid next statuses
TRANSITIONS = {
    "new": {"assigned"},
    "assigned": {"in_progress", "new"},   # 'new' allows un-assigning
    "in_progress": {"job_done"},
    "job_done": {"reviewed"},
    "reviewed": {"closed"},
    "closed": set(),
}


def validate_transition(current: str, next_status: str) -> None:
    """Raise ValidationError if the transition is not allowed."""
    allowed = TRANSITIONS.get(current, set())
    if next_status not in allowed:
        raise ValidationError(
            f"Invalid status transition: '{current}' → '{next_status}'. "
            f"Allowed: {sorted(allowed) or 'none'}."
        )
