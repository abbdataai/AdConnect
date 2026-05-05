# MKT WiFi — FastAPI backend (PostgreSQL)
# Run: uvicorn main:app --reload --port 8000
from __future__ import annotations
import time
from contextlib import asynccontextmanager
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from db import (
    init_db, seed_if_empty, get_session,
    Campaign as CampaignDB, User as UserDB, Session as SessionDB,
    Device as DeviceDB, NotifRule as NotifRuleDB, NotifGroup as NotifGroupDB,
)
from notifications import send_email
from mikrotik_api import MikrotikClient
from portal_routes import portal_router, _session_gc_loop
from auth import UserClaims, verify_token, require_role
from auth_routes import auth_router

# ── lifecycle ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    await init_db()
    await seed_if_empty()
    gc_task = asyncio.create_task(_session_gc_loop(), name="portal_session_gc")
    try:
        yield
    finally:
        gc_task.cancel()
        try:
            await gc_task
        except asyncio.CancelledError:
            pass

app = FastAPI(title="MKT WiFi API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portal_router)
app.include_router(auth_router)

# ── pydantic schemas ─────────────────────────────────────────────────────────
class Campaign(BaseModel):
    id: str
    name: str
    location: str
    created: str
    duration: int
    source: str = Field(..., description="YouTube | Upload")
    views: int
    completion: int
    revenue: int
    status: str = Field(..., description="active | paused | ended")

    class Config: from_attributes = True

class CampaignCreate(BaseModel):
    name: str
    location: str
    duration: int
    source: str = "YouTube"

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    duration: Optional[int] = None
    source: Optional[str] = None
    status: Optional[str] = None

# ── KPI / dashboard ──────────────────────────────────────────────────────────
@app.get("/api/kpis")
async def kpis(
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(verify_token),
):
    rows = (await s.execute(
        select(CampaignDB.status, func.count()).group_by(CampaignDB.status)
    )).all()
    counts = {r[0]: r[1] for r in rows}
    total_users = (await s.execute(select(func.count()).select_from(UserDB))).scalar_one()
    online = (await s.execute(
        select(func.count()).select_from(SessionDB).where(SessionDB.expires_at > int(time.time()))
    )).scalar_one()
    revenue = (await s.execute(
        select(func.coalesce(func.sum(CampaignDB.revenue), 0)).where(CampaignDB.status == "active")
    )).scalar_one()
    return {
        "reach": total_users, "reachDelta": 18,
        "activeCampaigns": counts.get("active", 0), "campaignsDelta": 2,
        "investment": revenue, "investmentDelta": 12,
        "onlineDevices": online or 12,
    }

@app.get("/api/connections/weekly")
async def weekly(_: UserClaims = Depends(verify_token)):
    return [
        {"day": "Seg", "value": 35}, {"day": "Ter", "value": 55},
        {"day": "Qua", "value": 42}, {"day": "Qui", "value": 70},
        {"day": "Sex", "value": 60}, {"day": "Sáb", "value": 85},
        {"day": "Hoje", "value": 100},
    ]

@app.get("/api/demographics")
async def demographics(
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(verify_token),
):
    total = (await s.execute(select(func.count()).select_from(UserDB))).scalar_one() or 1
    fem = (await s.execute(
        select(func.count()).select_from(UserDB).where(UserDB.gender == "F")
    )).scalar_one()
    masc = total - fem
    pct = lambda n: round(n / total * 100)
    rows = (await s.execute(
        select(UserDB.age_band, func.count()).group_by(UserDB.age_band)
    )).all()
    age_map = {r[0]: r[1] for r in rows}
    return {
        "gender": [
            {"label": "Feminino",  "pct": pct(fem),  "color": "var(--accent)"},
            {"label": "Masculino", "pct": pct(masc), "color": "var(--accent2)"},
        ],
        "age": [
            {"label": b, "pct": pct(age_map.get(b, 0))}
            for b in ["18–24", "25–34", "35–50", "50+"]
        ],
    }

# ── campaigns ────────────────────────────────────────────────────────────────
@app.get("/api/campaigns", response_model=List[Campaign])
async def list_campaigns(
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(verify_token),
):
    rows = (await s.execute(select(CampaignDB).order_by(CampaignDB.created.desc()))).scalars().all()
    return [Campaign.model_validate(r) for r in rows]

@app.post("/api/campaigns", response_model=Campaign, status_code=201)
async def create_campaign(
    body: CampaignCreate,
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin"])),
):
    cid = "c" + str(int(time.time() * 1000))
    today = datetime.now().strftime("%d/%m/%Y")
    row = CampaignDB(
        id=cid, name=body.name, location=body.location, created=today,
        duration=body.duration, source=body.source,
        views=0, completion=0, revenue=0, status="active",
    )
    s.add(row)
    await s.commit()
    send_email(group="anunciantes",
               subject="Nova campanha disponível",
               body=f"Campanha {body.name} ativada.")
    return Campaign.model_validate(row)

@app.patch("/api/campaigns/{cid}", response_model=Campaign)
async def update_campaign(
    cid: str,
    body: CampaignUpdate,
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin"])),
):
    row = await s.get(CampaignDB, cid)
    if not row:
        raise HTTPException(404, "Campanha não encontrada")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await s.commit()
    return Campaign.model_validate(row)

@app.delete("/api/campaigns/{cid}", status_code=204)
async def delete_campaign(
    cid: str,
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin"])),
):
    await s.execute(delete(CampaignDB).where(CampaignDB.id == cid))
    await s.commit()

# ── users / sessions ────────────────────────────────────────────────────────
@app.get("/api/users")
async def list_users(
    zone: Optional[str] = None,
    q: Optional[str] = None,
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin", "viewer"])),
):
    stmt = select(UserDB)
    if zone:
        stmt = stmt.where(UserDB.zone == zone)
    if q:
        like = f"%{q}%"
        stmt = stmt.where((UserDB.name.ilike(like)) | (UserDB.phone.ilike(like)) | (UserDB.email.ilike(like)))
    rows = (await s.execute(stmt)).scalars().all()
    return [{"id": r.id, "name": r.name, "phone": r.phone, "email": r.email,
             "zone": r.zone, "age": r.age, "gender": r.gender,
             "lastConnection": r.last_connection, "connections": r.connections}
            for r in rows]

@app.get("/api/users/live")
async def live_users(
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin", "viewer"])),
):
    now = int(time.time())
    stmt = (select(UserDB, SessionDB.expires_at)
            .join(SessionDB, SessionDB.user_id == UserDB.id)
            .where(SessionDB.expires_at > now)
            .order_by(SessionDB.expires_at.asc()))
    rows = (await s.execute(stmt)).all()
    return [{"id": u.id, "name": u.name,
             "initials": "".join(p[0] for p in u.name.split()[:2]).upper(),
             "gender": u.gender, "age": u.age, "zone": u.zone,
             "remaining": max(0, exp - now),
             "palette": ["#6c63ff", "#a78bfa"]}
            for (u, exp) in rows]

# NOTE: Legacy POST /api/connect (collected phone/email, called WhatsApp) was
# DELETED in the captive-portal slice — see DESIGN_CAPTIVE_PORTAL.md Decision 1.
# The replacement lives in portal_routes.py and complies with NFR-005 (LGPD
# anonymization mandate). Lead persistence lands in the DB-baseline slice.

# ── devices (MikroTik) ──────────────────────────────────────────────────────
@app.get("/api/devices")
async def devices(
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin", "viewer"])),
):
    rows = (await s.execute(select(DeviceDB))).scalars().all()
    out = []
    for r in rows:
        d = {"id": r.id, "name": r.name, "ip": r.ip, "mac": r.mac,
             "cpu": r.cpu, "ram": r.ram, "users": r.users,
             "up": r.up_mbps, "down": r.down_mbps, "status": r.status}
        if r.status == "offline":
            d["lastSeen"] = r.last_seen or "indisponível"
        out.append(d)
    return out

@app.post("/api/devices/{did}/refresh")
async def refresh_device(
    did: str,
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin"])),
):
    row = await s.get(DeviceDB, did)
    if not row:
        raise HTTPException(404, "Dispositivo não encontrado")
    mt = MikrotikClient(ip=row.ip)
    info = mt.fetch_status()
    row.cpu = info["cpu"]; row.ram = info["ram"]; row.users = info["users"]
    row.up_mbps = info["up"]; row.down_mbps = info["down"]; row.status = info["status"]
    await s.commit()
    return info

# ── notifications ───────────────────────────────────────────────────────────
@app.get("/api/notifications/rules")
async def notif_rules(
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin", "viewer"])),
):
    rows = (await s.execute(select(NotifRuleDB))).scalars().all()
    return [{"id": r.id, "channel": r.channel, "icon": r.icon,
             "title": r.title, "desc": r.desc, "active": r.active}
            for r in rows]

@app.patch("/api/notifications/rules/{rid}")
async def patch_rule(
    rid: str,
    body: dict,
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin"])),
):
    if "active" in body:
        await s.execute(update(NotifRuleDB).where(NotifRuleDB.id == rid).values(active=bool(body["active"])))
        await s.commit()
    return {"ok": True}

@app.get("/api/notifications/groups")
async def notif_groups(
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin", "viewer"])),
):
    rows = (await s.execute(select(NotifGroupDB))).scalars().all()
    return [{"id": r.id, "name": r.name, "members": r.members, "desc": r.desc} for r in rows]

# ── monetization / reports / form ───────────────────────────────────────────
@app.get("/api/monetization")
def monetization(_: UserClaims = Depends(require_role(["admin"]))):
    return [
        {"id": "view",   "icon": "Play",     "name": "Por visualização",      "desc": "Cobra por cada vídeo assistido. Ideal para anunciantes que pagam por CPV (custo por view)."},
        {"id": "time",   "icon": "Clock",    "name": "Por pacote de tempo",   "desc": "Cobra pacotes fechados (ex: 10h de wi-fi = R$50). O anunciante paga pelo período."},
        {"id": "hybrid", "icon": "Shuffle",  "name": "Híbrido (view + tempo)","desc": "Combina os dois modelos. Cobra por view E por tempo mínimo de campanha ativa."},
        {"id": "fixed",  "icon": "Calendar", "name": "Plano fixo mensal",     "desc": "Anunciante paga mensalidade fixa para estar na plataforma com vídeo ativo."},
    ]

@app.get("/api/reports")
def reports(_: UserClaims = Depends(verify_token)):
    return [
        {"id": "r1", "name": "Relatório de conexões — Abril/2026", "date": "01/05/2026", "size": "2,4 MB", "type": "PDF"},
        {"id": "r2", "name": "ROI por campanha — Q1 2026",          "date": "15/04/2026", "size": "1,1 MB", "type": "PDF"},
        {"id": "r3", "name": "Demografia de usuários",              "date": "10/04/2026", "size": "850 KB", "type": "Planilha"},
        {"id": "r4", "name": "Logs MikroTik — semana 14",            "date": "07/04/2026", "size": "4,8 MB", "type": "CSV"},
    ]

# NOTE: Legacy GET /api/connection/form (returned a forbidden-field form schema
# with phone+email) was DELETED in the captive-portal slice — see
# DESIGN_CAPTIVE_PORTAL.md Decision 1. Replacement is BootstrapResponse.form_config
# in portal_routes.py, which exposes only the LGPD-anonymizable fields.

@app.get("/")
def root():
    return {"name": "MKT WiFi API", "docs": "/docs"}

# NOTE: Legacy /api/auth/login + /api/auth/logout + LoginRequest + DEMO_ACCOUNTS
# moved to backend/auth_routes.py + backend/auth.py in slice 3 (auth-hardening).
# /api/auth/* now mints real JWTs via python-jose with HS256, 7-day TTL, and the
# 5 locked claims. See DESIGN_AUTH_HARDENING.md Decisions 4-7.
