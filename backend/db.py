"""
Database layer — Postgres via SQLAlchemy 2.x (async).

Connection string is read from DATABASE_URL, e.g.:
    postgresql+asyncpg://mktwifi:secret@localhost:5432/mktwifi

For local dev without Postgres, you can still point at SQLite:
    sqlite+aiosqlite:///./mktwifi.db
"""
import os, time
from datetime import datetime
from typing import AsyncGenerator

from sqlalchemy import (
    String, Integer, Boolean, ForeignKey, select, func
)
from sqlalchemy.ext.asyncio import (
    AsyncSession, async_sessionmaker, create_async_engine
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://mktwifi:mktwifi@localhost:5432/mktwifi",
)

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


# ── models ───────────────────────────────────────────────────────────────────
class Campaign(Base):
    __tablename__ = "campaigns"
    id:         Mapped[str] = mapped_column(String, primary_key=True)
    name:       Mapped[str] = mapped_column(String)
    location:   Mapped[str] = mapped_column(String)
    created:    Mapped[str] = mapped_column(String)
    duration:   Mapped[int] = mapped_column(Integer)
    source:     Mapped[str] = mapped_column(String)
    views:      Mapped[int] = mapped_column(Integer, default=0)
    completion: Mapped[int] = mapped_column(Integer, default=0)
    revenue:    Mapped[int] = mapped_column(Integer, default=0)
    status:     Mapped[str] = mapped_column(String, default="active")


class User(Base):
    __tablename__ = "users"
    id:              Mapped[str] = mapped_column(String, primary_key=True)
    name:            Mapped[str] = mapped_column(String)
    phone:           Mapped[str] = mapped_column(String)
    email:           Mapped[str | None] = mapped_column(String, nullable=True)
    zone:            Mapped[str] = mapped_column(String)
    age:             Mapped[int] = mapped_column(Integer)
    gender:          Mapped[str] = mapped_column(String)
    age_band:        Mapped[str] = mapped_column(String)
    last_connection: Mapped[str] = mapped_column(String)
    connections:     Mapped[int] = mapped_column(Integer, default=1)


class Session(Base):
    __tablename__ = "sessions"
    id:         Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:    Mapped[str] = mapped_column(ForeignKey("users.id"))
    started_at: Mapped[int] = mapped_column(Integer)
    expires_at: Mapped[int] = mapped_column(Integer)


class Device(Base):
    __tablename__ = "devices"
    id:        Mapped[str] = mapped_column(String, primary_key=True)
    name:      Mapped[str] = mapped_column(String)
    ip:        Mapped[str] = mapped_column(String)
    mac:       Mapped[str] = mapped_column(String)
    cpu:       Mapped[int] = mapped_column(Integer, default=0)
    ram:       Mapped[int] = mapped_column(Integer, default=0)
    users:     Mapped[int] = mapped_column(Integer, default=0)
    up_mbps:   Mapped[int] = mapped_column(Integer, default=0)
    down_mbps: Mapped[int] = mapped_column(Integer, default=0)
    status:    Mapped[str] = mapped_column(String, default="online")
    last_seen: Mapped[str | None] = mapped_column(String, nullable=True)


class NotifRule(Base):
    __tablename__ = "notif_rules"
    id:      Mapped[str]  = mapped_column(String, primary_key=True)
    channel: Mapped[str]  = mapped_column(String)
    icon:    Mapped[str]  = mapped_column(String)
    title:   Mapped[str]  = mapped_column(String)
    desc:    Mapped[str]  = mapped_column(String)
    active:  Mapped[bool] = mapped_column(Boolean, default=True)


class NotifGroup(Base):
    __tablename__ = "notif_groups"
    id:      Mapped[str] = mapped_column(String, primary_key=True)
    name:    Mapped[str] = mapped_column(String)
    members: Mapped[int] = mapped_column(Integer, default=0)
    desc:    Mapped[str] = mapped_column(String)


# ── lifecycle helpers ────────────────────────────────────────────────────────
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_if_empty() -> None:
    async with SessionLocal() as s:
        existing = (await s.execute(select(func.count()).select_from(Campaign))).scalar_one()
        if existing > 0:
            return
        now = int(time.time())
        s.add_all([
            Campaign(id="c1", name="Promo Verão Sorvetes", location="Praia Central",
                     created="12/04/2026", duration=30, source="YouTube",
                     views=1245, completion=87, revenue=180, status="active"),
            Campaign(id="c2", name="Lanchonete do Zé", location="Centro Comercial",
                     created="08/04/2026", duration=20, source="Upload",
                     views=892, completion=72, revenue=120, status="active"),
            Campaign(id="c3", name="Pet Shop Amigo Fiel", location="Zona Sul",
                     created="02/04/2026", duration=25, source="YouTube",
                     views=2103, completion=91, revenue=260, status="active"),
            Campaign(id="c4", name="Barbearia Vintage", location="Centro",
                     created="25/03/2026", duration=15, source="Upload",
                     views=456, completion=65, revenue=80, status="paused"),
            Campaign(id="c5", name="Restaurante Italiano", location="Zona Norte",
                     created="18/03/2026", duration=40, source="YouTube",
                     views=3421, completion=88, revenue=420, status="ended"),
        ])
        s.add_all([
            User(id="u1", name="Marina Silva",  phone="(11) 98765-4321", email="marina@email.com",
                 zone="Centro",      age=27, gender="F", age_band="25–34",
                 last_connection="02/05/2026 14:23", connections=12),
            User(id="u2", name="João Santos",   phone="(11) 91234-5678", email=None,
                 zone="Zona Norte",  age=34, gender="M", age_band="25–34",
                 last_connection="02/05/2026 13:45", connections=8),
            User(id="u3", name="Beatriz Costa", phone="(11) 99876-1234", email="beatriz@email.com",
                 zone="Zona Sul",    age=22, gender="F", age_band="18–24",
                 last_connection="02/05/2026 12:10", connections=24),
            User(id="u4", name="Ricardo Lima",  phone="(11) 95555-7777", email=None,
                 zone="Zona Leste",  age=45, gender="M", age_band="35–50",
                 last_connection="02/05/2026 11:02", connections=6),
            User(id="u5", name="Camila Rocha",  phone="(11) 92222-3333", email="camila@email.com",
                 zone="Centro",      age=29, gender="F", age_band="25–34",
                 last_connection="01/05/2026 19:30", connections=18),
        ])
        s.add_all([
            Session(user_id="u1", started_at=now, expires_at=now + 1800),
            Session(user_id="u2", started_at=now, expires_at=now + 900),
            Session(user_id="u3", started_at=now, expires_at=now + 2400),
        ])
        s.add_all([
            Device(id="d1", name="Roteador Centro",     ip="192.168.1.10", mac="E4:8D:8C:11:22:33",
                   cpu=34, ram=52, users=18, up_mbps=12, down_mbps=45, status="online"),
            Device(id="d2", name="Roteador Zona Sul",   ip="192.168.1.11", mac="E4:8D:8C:44:55:66",
                   cpu=58, ram=71, users=32, up_mbps=24, down_mbps=68, status="online"),
            Device(id="d3", name="Roteador Zona Norte", ip="192.168.1.12", mac="E4:8D:8C:77:88:99",
                   cpu=0, ram=0, users=0, up_mbps=0, down_mbps=0, status="offline", last_seen="há 2h"),
        ])
        s.add_all([
            NotifRule(id="n1", channel="WhatsApp", icon="Phone",
                      title="Cliente conectou", desc="Mensagem de boas-vindas via WhatsApp", active=True),
            NotifRule(id="n2", channel="Email", icon="Mail",
                      title="Anunciante: nova campanha", desc="Email automático para o grupo de anunciantes", active=True),
            NotifRule(id="n3", channel="WhatsApp", icon="Phone",
                      title="Acesso expirando", desc="Aviso 5 min antes do fim da sessão", active=True),
            NotifRule(id="n4", channel="Email", icon="Mail",
                      title="Roteador offline", desc="Alerta para o admin quando MikroTik cai", active=False),
        ])
        s.add_all([
            NotifGroup(id="g1", name="Anunciantes",     members=24,   desc="Recebem novas campanhas e relatórios mensais"),
            NotifGroup(id="g2", name="Admin técnico",   members=3,    desc="Alertas de roteador, falhas e manutenção"),
            NotifGroup(id="g3", name="Clientes ativos", members=1284, desc="Promoções e mensagens de retenção"),
        ])
        await s.commit()
