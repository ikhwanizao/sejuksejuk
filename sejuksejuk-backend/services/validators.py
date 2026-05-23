from django.core.exceptions import ValidationError

ALLOWED_MIME_TYPES = {
    "photo": ["image/jpeg", "image/png", "image/webp"],
    "video": ["video/mp4", "video/quicktime", "video/x-msvideo"],
    "pdf": ["application/pdf"],
}
MAX_FILE_SIZE_MB = 50
MAX_ATTACHMENTS = 6


def detect_kind(file) -> str:
    """Infer attachment kind from content_type."""
    content_type = getattr(file, "content_type", "")
    for kind, mimes in ALLOWED_MIME_TYPES.items():
        if content_type in mimes:
            return kind
    raise ValidationError(
        f"Unsupported file type '{content_type}'. "
        f"Allowed: {[m for ms in ALLOWED_MIME_TYPES.values() for m in ms]}"
    )


def validate_attachment_file(file):
    size_mb = file.size / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise ValidationError(f"File too large ({size_mb:.1f} MB). Max {MAX_FILE_SIZE_MB} MB.")
    detect_kind(file)


def validate_attachment_count(report):
    if report.attachments.count() >= MAX_ATTACHMENTS:
        raise ValidationError(f"Maximum {MAX_ATTACHMENTS} attachments per report.")
