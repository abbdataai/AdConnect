"""Captive-portal FastAPI router (Phase 3 — vertical slice with mocked backend).

Endpoints:
    GET  /api/portal/bootstrap                   — venue + branding + campaign + form
    POST /api/connect                            — form submit (NO MAC authorize yet)
    POST /api/sessions/{session_id}/ad-complete  — ad finished → grant 30 min
    POST /api/sessions/{session_id}/renew        — start renewal flow (60s ad)

Design references: DESIGN_CAPTIVE_PORTAL.md Decisions 1, 2, 3, 10.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, FastAPI, HTTPException

from fixtures.portal_fixtures import (
    CAFE_IMPERIAL_CAMPAIGN, FIRST_SESSION_GRANT_SECONDS, FORM_CONFIG_LOCKED,
    PRACA_CENTRAL_VENUE, RENEWAL_AD_SECONDS,
)
from schemas.portal import (
    AdCompleteResponse, BootstrapResponse, ConnectRequest, ConnectResponse,
    RenewResponse,
)

log = logging.getLogger("portal")

PENDING_AD_TTL = 600
EXPIRED_GRACE_TTL = 300
GC_INTERVAL = 60

SessionStatus = Literal["pending_ad", "authorized", "expired"]


@dataclass
class SessionState:
    session_id: UUID
    venue_id: UUID
    mac_hash: str
    campaign_id: UUID
    first_name: str
    consent_text_version: str
    status: SessionStatus
    created_at: datetime
    expires_at: datetime | None = None


SESSIONS: dict[UUID, SessionState] = {}

portal_router = APIRouter(prefix="/api", tags=["portal"])


def authorize_mac_stub(mac_hash: str, expires_at: datetime) -> bool:
    """Stub for MikroTik authorize_mac. Future MikroTik POC slice (R2) replaces
    this body with `mikrotik_api.MikrotikClient(...).authorize_mac(...)`.
    Never logs the full mac_hash — only an 8-char prefix (LGPD safety)."""
    log.info(
        "mikrotik_authorize_stub",
        extra={
            "event_type": "mikrotik_authorize_stub",
            "mac_hash_prefix": mac_hash[:8],
            "expires_at": expires_at.isoformat(),
        },
    )
    return True


@portal_router.get("/portal/bootstrap", response_model=BootstrapResponse)
async def bootstrap(
    venue_id: UUID, device_id: UUID, mac_hash: str
) -> BootstrapResponse:
    log.info(
        "portal_bootstrap",
        extra={
            "event_type": "portal_bootstrap",
            "venue_id": str(venue_id),
            "device_id": str(device_id),
            "mac_hash_prefix": mac_hash[:8] if mac_hash else "",
        },
    )
    return BootstrapResponse(
        venue=PRACA_CENTRAL_VENUE,
        active_campaign=CAFE_IMPERIAL_CAMPAIGN,
        form_config=FORM_CONFIG_LOCKED,
    )


@portal_router.post("/connect", response_model=ConnectResponse, status_code=201)
async def connect(body: ConnectRequest) -> ConnectResponse:
    if not body.consent.accepted:
        raise HTTPException(status_code=422, detail="consent_required")
    session = SessionState(
        session_id=uuid4(),
        venue_id=body.venue_id,
        mac_hash=body.mac_hash,
        campaign_id=body.campaign_id,
        first_name=body.lead.first_name,
        consent_text_version=body.consent.consent_text_version,
        status="pending_ad",
        created_at=datetime.now(timezone.utc),
    )
    SESSIONS[session.session_id] = session
    log.info(
        "session_pending_ad",
        extra={
            "event_type": "session_pending_ad",
            "session_id": str(session.session_id),
            "venue_id": str(session.venue_id),
            "mac_hash_prefix": session.mac_hash[:8],
        },
    )
    return ConnectResponse(
        session_id=session.session_id,
        redirect_to_ad=True,
        ad_seconds=CAFE_IMPERIAL_CAMPAIGN.ad_seconds,
    )


@portal_router.post(
    "/sessions/{session_id}/ad-complete", response_model=AdCompleteResponse,
)
async def ad_complete(session_id: UUID) -> AdCompleteResponse:
    session = SESSIONS.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="session_not_found")
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=FIRST_SESSION_GRANT_SECONDS
    )
    authorize_mac_stub(session.mac_hash, expires_at)
    session.status = "authorized"
    session.expires_at = expires_at
    log.info(
        "session_authorized",
        extra={
            "event_type": "session_authorized",
            "session_id": str(session_id),
            "venue_id": str(session.venue_id),
        },
    )
    return AdCompleteResponse(
        expires_at=expires_at, remaining_seconds=FIRST_SESSION_GRANT_SECONDS,
    )


@portal_router.post(
    "/sessions/{session_id}/renew", response_model=RenewResponse,
)
async def renew(session_id: UUID) -> RenewResponse:
    session = SESSIONS.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="session_not_found")
    renewal_campaign = CAFE_IMPERIAL_CAMPAIGN.model_copy(
        update={"ad_seconds": RENEWAL_AD_SECONDS}
    )
    log.info(
        "session_renew_requested",
        extra={
            "event_type": "session_renew_requested",
            "session_id": str(session_id),
            "venue_id": str(session.venue_id),
        },
    )
    return RenewResponse(
        campaign=renewal_campaign, pending_session_id=session_id,
    )


async def _session_gc_loop() -> None:
    while True:
        try:
            await asyncio.sleep(GC_INTERVAL)
            now = datetime.now(timezone.utc)
            evicted_pending = 0
            evicted_expired = 0
            for sid, s in list(SESSIONS.items()):
                age = (now - s.created_at).total_seconds()
                if s.status == "pending_ad" and age > PENDING_AD_TTL:
                    del SESSIONS[sid]
                    evicted_pending += 1
                elif (
                    s.status == "authorized"
                    and s.expires_at is not None
                    and (now - s.expires_at).total_seconds() > EXPIRED_GRACE_TTL
                ):
                    del SESSIONS[sid]
                    evicted_expired += 1
            if evicted_pending or evicted_expired:
                log.info(
                    "session_gc_swept",
                    extra={
                        "event_type": "session_gc_swept",
                        "evicted_pending": evicted_pending,
                        "evicted_expired": evicted_expired,
                        "remaining": len(SESSIONS),
                    },
                )
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("session_gc_loop_error")


@asynccontextmanager
async def portal_lifespan(_app: FastAPI):
    gc_task = asyncio.create_task(_session_gc_loop(), name="portal_session_gc")
    try:
        yield
    finally:
        gc_task.cancel()
        try:
            await gc_task
        except asyncio.CancelledError:
            pass
