class NarrationNotFound(Exception):
    """Raised when a report is not available to the requesting user."""


class NarrationUnavailable(Exception):
    """Raised when narration text or audio cannot be generated."""
