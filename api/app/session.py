"""Anonymous session handling: a session id in an HttpOnly cookie, no login."""

from fastapi import Request, Response

from app import db
from app.config import settings


def get_session(request: Request, response: Response) -> str:
    """
    Return the caller's session id, creating a session when there isn't an
    active one. A new session starts out linked to the default documents.
    """
    session_id = request.cookies.get(settings.session_cookie_name)

    if session_id and db.session_is_active(session_id):
        return session_id

    session_id = db.create_session()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_id,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        path="/",
    )
    return session_id
