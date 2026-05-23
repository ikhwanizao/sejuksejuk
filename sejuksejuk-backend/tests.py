import pytest
from django.core.exceptions import ValidationError
from orders.state import validate_transition


# ── State machine ──────────────────────────────────────────────────────────────

class TestStateMachine:
    def test_valid_new_to_assigned(self):
        validate_transition("new", "assigned")  # no exception

    def test_valid_full_chain(self):
        chain = ["new", "assigned", "in_progress", "job_done", "reviewed", "closed"]
        for i in range(len(chain) - 1):
            validate_transition(chain[i], chain[i + 1])

    def test_invalid_skip(self):
        with pytest.raises(ValidationError):
            validate_transition("new", "job_done")

    def test_invalid_backward(self):
        with pytest.raises(ValidationError):
            validate_transition("job_done", "in_progress")

    def test_closed_is_terminal(self):
        with pytest.raises(ValidationError):
            validate_transition("closed", "reviewed")


# ── Notification deep-link ────────────────────────────────────────────────────

class TestWhatsAppDeepLink:
    def test_basic_link(self):
        from notifications.services import WhatsAppDeepLinkProvider
        url = WhatsAppDeepLinkProvider.build("0111234567", "Hello World")
        assert url.startswith("https://wa.me/0111234567")
        assert "Hello%20World" in url

    def test_strips_plus(self):
        from notifications.services import WhatsAppDeepLinkProvider
        url = WhatsAppDeepLinkProvider.build("+60111234567", "Hi")
        assert url.startswith("https://wa.me/60111234567")

    def test_empty_phone_returns_empty(self):
        from notifications.services import WhatsAppDeepLinkProvider
        assert WhatsAppDeepLinkProvider.build("", "msg") == ""

    def test_special_chars_encoded(self):
        from notifications.services import WhatsAppDeepLinkProvider
        url = WhatsAppDeepLinkProvider.build("0111234567", "Job ORD001 done & ok!")
        assert " " not in url
        assert "&" not in url.split("?text=")[1]


# ── Attachment validators ─────────────────────────────────────────────────────

class TestAttachmentValidators:
    def test_oversize_rejected(self):
        from django.core.exceptions import ValidationError as DjValidationError
        from services.validators import validate_attachment_file
        from unittest.mock import MagicMock

        f = MagicMock()
        f.size = 60 * 1024 * 1024  # 60 MB
        f.content_type = "image/jpeg"
        with pytest.raises(DjValidationError):
            validate_attachment_file(f)

    def test_unsupported_mime_rejected(self):
        from django.core.exceptions import ValidationError as DjValidationError
        from services.validators import validate_attachment_file
        from unittest.mock import MagicMock

        f = MagicMock()
        f.size = 1024
        f.content_type = "application/x-executable"
        with pytest.raises(DjValidationError):
            validate_attachment_file(f)

    def test_valid_jpeg_accepted(self):
        from services.validators import detect_kind
        from unittest.mock import MagicMock

        f = MagicMock()
        f.content_type = "image/jpeg"
        assert detect_kind(f) == "photo"

    def test_valid_pdf_accepted(self):
        from services.validators import detect_kind
        from unittest.mock import MagicMock

        f = MagicMock()
        f.content_type = "application/pdf"
        assert detect_kind(f) == "pdf"


# ── AI runner tool iteration cap ─────────────────────────────────────────────

@pytest.mark.django_db
class TestAIRunner:
    def test_mock_provider_returns_answer(self):
        from ai_assistant.runner import run_query

        result = run_query("How many jobs today?")
        assert "answer" in result
        assert isinstance(result["answer"], str)
        assert len(result["answer"]) > 0

    def test_tool_calls_recorded(self):
        from ai_assistant.runner import run_query

        result = run_query("List jobs completed by Ali this week")
        # Mock provider triggers a tool call; tool_calls list should be populated
        assert "tool_calls" in result
        assert isinstance(result["tool_calls"], list)

    def test_iteration_cap_does_not_infinite_loop(self):
        """Runner must not loop forever even if provider always returns tool_calls."""
        from ai_assistant import runner
        from ai_assistant.runner import run_query

        original = runner.MAX_TOOL_ITERATIONS
        runner.MAX_TOOL_ITERATIONS = 2

        try:
            result = run_query("test infinite loop guard")
            assert "answer" in result
        finally:
            runner.MAX_TOOL_ITERATIONS = original


# ── AI tool execute_tool ──────────────────────────────────────────────────────

class TestAITools:
    def test_unknown_tool_returns_error(self):
        import json
        from ai_assistant.tools import execute_tool

        result = json.loads(execute_tool("nonexistent_tool", "{}"))
        assert "error" in result

    def test_invalid_json_args(self):
        import json
        from ai_assistant.tools import execute_tool

        result = json.loads(execute_tool("count_jobs", "{bad json"))
        assert "error" in result

    def test_count_jobs_bad_period(self):
        """count_jobs with an invalid period should raise a TypeError caught by execute_tool."""
        import json
        from ai_assistant.tools import execute_tool

        # Passes an unexpected kwarg — should be caught gracefully
        result = json.loads(execute_tool("count_jobs", '{"period": "week", "unknown_arg": true}'))
        assert "error" in result
