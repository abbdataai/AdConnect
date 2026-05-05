# MKT WiFi — Backend (FastAPI + PostgreSQL)

Captive-portal monetization platform: provisions Wi-Fi access via MikroTik in
exchange for a quick form + ad view, and notifies advertisers/clients via
WhatsApp & email.

## Stack

- **FastAPI** — async REST API
- **SQLAlchemy 2.x (async)** + **asyncpg** — Postgres ORM
- **PostgreSQL 14+** — primary datastore

## 1. Run Postgres locally

Easiest path with Docker:

```bash
docker run --name mktwifi-pg \
  -e POSTGRES_USER=mktwifi \
  -e POSTGRES_PASSWORD=mktwifi \
  -e POSTGRES_DB=mktwifi \
  -p 5432:5432 -d postgres:16
```

Or install Postgres natively and create the role + database:

```sql
CREATE ROLE mktwifi WITH LOGIN PASSWORD 'mktwifi';
CREATE DATABASE mktwifi OWNER mktwifi;
```

## 2. Run the API

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL="postgresql+asyncpg://mktwifi:mktwifi@localhost:5432/mktwifi"
export JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
uvicorn main:app --reload --port 8000
```

On first run, tables are created (`Base.metadata.create_all`) and seeded with
demo data. Open http://localhost:8000/docs for Swagger UI.

### JWT_SECRET (slice 3 — auth hardening)

Admin endpoints require a `Authorization: Bearer <jwt>` header. Tokens are
HS256-signed with `JWT_SECRET` (32-byte recommended) and have a 7-day TTL.

| Environment | `JWT_SECRET` unset behavior |
|-------------|----------------------------|
| `dev` (or unset) | Backend logs a `WARNING`, generates a random secret, continues. Tokens invalidate on every restart. |
| `production` / `prod` (set `ENVIRONMENT=production`) | Backend **refuses to start** with `RuntimeError`. Set `JWT_SECRET` before deploying. |

**Rotation note:** rotating `JWT_SECRET` invalidates all in-flight tokens, forcing
operators to re-login. This is acceptable during scheduled maintenance; for
incident-response key rotation (e.g., suspected secret leak), this is the
intended behavior.

> **Migrations**: for production, swap `init_db()` for Alembic
> (`alembic init alembic` → `alembic revision --autogenerate` → `alembic upgrade head`).

## 3. Local-dev fallback (no Postgres)

You can still point the same code at SQLite while developing:

```bash
pip install aiosqlite
export DATABASE_URL="sqlite+aiosqlite:///./mktwifi.db"
```

## Endpoints

| Method | Path                                | Purpose                                 |
|-------:|-------------------------------------|-----------------------------------------|
| GET    | `/api/kpis`                         | Dashboard top-row metrics                |
| GET    | `/api/connections/weekly`           | 7-day connection chart                   |
| GET    | `/api/demographics`                 | Gender + age breakdown                   |
| GET    | `/api/campaigns`                    | List all campaigns                       |
| POST   | `/api/campaigns`                    | Create campaign                          |
| PATCH  | `/api/campaigns/{id}`               | Edit / pause / reactivate                |
| DELETE | `/api/campaigns/{id}`               | Remove                                   |
| GET    | `/api/users`                        | List users (`?zone=`, `?q=`)             |
| GET    | `/api/users/live`                   | Currently connected (with countdowns)    |
| GET    | `/api/devices`                      | MikroTik routers status                  |
| POST   | `/api/devices/{id}/refresh`         | Pull live telemetry                      |
| GET    | `/api/notifications/rules`          | Notification rules list                  |
| PATCH  | `/api/notifications/rules/{id}`     | Toggle rule on/off                       |
| GET    | `/api/notifications/groups`         | Recipient groups                         |
| GET    | `/api/monetization`                 | Monetization plan options                |
| GET    | `/api/reports`                      | Available reports                        |

### Captive-portal endpoints (LGPD-compliant — see `portal_routes.py`)

| Method | Path                                          | Purpose                                                |
|-------:|-----------------------------------------------|--------------------------------------------------------|
| GET    | `/api/portal/bootstrap`                       | Venue + branding + active campaign + form config       |
| POST   | `/api/connect`                                | Form submit (lead + consent) — does NOT yet authorize   |
| POST   | `/api/sessions/{id}/ad-complete`              | Ad finished → grant 30 min, authorize MAC (stub)        |
| POST   | `/api/sessions/{id}/renew`                    | Initiate renewal (returns 60-second ad)                 |

**Run with one worker only** for the captive-portal slice — sessions are stored in
an in-memory `dict` and are not shared across workers (see DESIGN_CAPTIVE_PORTAL.md
Decision 3, OQ-2). When the DB-baseline slice lands, this constraint disappears.

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
```

**LGPD compliance (NFR-005):** the captive portal collects only
`first_name + age_band + gender + neighborhood`. The schema enforces this via
`Pydantic.model_config = ConfigDict(extra="forbid")` + `Literal` types. The
CI script `backend/scripts/grep_pii_check.sh` (AT-015) runs in pre-commit /
CI and fails if forbidden field identifiers (`phone`, `email`, `cpf`,
`last_name`, `mac_address`) appear in portal source.

**Session TTLs:** pending-ad sessions are evicted after 10 min; expired sessions
after a 5-min grace window. The GC task wakes every 60 s and logs evictions
under `event_type=session_gc_swept`.

### Tests

```bash
pip install pytest pytest-asyncio httpx
pytest backend/tests -v
bash backend/scripts/grep_pii_check.sh
```

## Integrations to plug in

- **MikroTik** (`mikrotik_api.py`) — swap mock with `librouteros`
- **WhatsApp** (`notifications.py::send_whatsapp`) — swap log with Twilio / Meta Cloud
- **Email**    (`notifications.py::send_email`)    — swap log with SMTP / SendGrid

## Frontend

Open `MKT WiFi.html` in the project root. The React prototype is wired to mocked
data by default; point it at `http://localhost:8000/api/*` to use this backend
live.
