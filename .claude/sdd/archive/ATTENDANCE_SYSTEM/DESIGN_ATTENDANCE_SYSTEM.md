# DESIGN: Workforce Management & Attendance System (Module 1)

> Technical design for an offline-first PWA check-in system with multi-site management, automated payroll export, and a React + FastAPI + PostgreSQL stack.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ATTENDANCE_SYSTEM |
| **Date** | 2026-04-20 |
| **Author** | design-agent |
| **DEFINE** | [DEFINE_ATTENDANCE_SYSTEM.md](./DEFINE_ATTENDANCE_SYSTEM.md) |
| **Status** | ✅ Shipped |

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                PROSSOLO ATTENDANCE SYSTEM — MODULE 1                 │
├──────────────────────┬──────────────────────┬───────────────────────┤
│   SITE TABLET        │   ADMIN DASHBOARD     │   BACKGROUND JOBS     │
│   (React PWA)        │   (React SPA)         │   (APScheduler)       │
│                      │                       │                       │
│  QR Scan (camera)    │  Employee CRUD        │  Payroll Export Cron  │
│  PIN Entry           │  Attendance View      │  (configurable sched) │
│  Selfie Capture      │  Manual Corrections   │        │              │
│  GPS Capture         │  Point Mirror Report  │        ▼              │
│       │              │  Shift Config         │   Email (.TXT/.CSV)   │
│  IndexedDB Queue     │  Site Management      │   → HR inbox          │
│  (offline-first)     │       │               │                       │
│  Workbox BG Sync     │       │               │                       │
└──────────┬───────────┴───────┬───────────────┴───────────────────────┘
           │                   │
           │  HTTPS + JWT      │  HTTPS + JWT
           ▼                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       FASTAPI REST API                                │
│                                                                      │
│  POST /checkins (idempotent, event_id UUID)                          │
│  POST /sync     (bulk idempotent replay)                             │
│  POST /employees (create + generate QR + PIN)                        │
│  GET  /reports/point-mirror                                          │
│  GET  /reports/payroll-export                                        │
│  POST /auth/login  │  POST /auth/refresh                             │
│  GET  /sites       │  POST /sites                                    │
└──────────────┬───────────────────────┬───────────────────────────────┘
               │                       │
               ▼                       ▼
┌──────────────────────┐   ┌──────────────────────────────────────────┐
│   PostgreSQL DB      │   │   Blob Storage (cloud-agnostic)          │
│                      │   │   Implementations:                        │
│  sites               │   │   - GCSStorageBackend                    │
│  employees           │   │   - S3StorageBackend                     │
│  shifts              │   │   - LocalStorageBackend (dev)            │
│  checkins            │   │                                          │
│  checkin_photos      │   │   Selfie photos stored as:               │
│  attendance_edits    │   │   {site_id}/{employee_id}/{event_id}.jpg  │
│  audit_log           │   └──────────────────────────────────────────┘
│  payroll_export_runs │
│  export_schedules    │
└──────────────────────┘
```

---

## Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| **PWA Tablet App** | Employee check-in interface with offline-first queue | React + Workbox + IndexedDB |
| **Admin Dashboard** | Roster, attendance, reports, config management | React SPA |
| **FastAPI REST API** | Business logic, auth, sync, report generation | Python 3.11 + FastAPI |
| **Pydantic Models** | Request/response validation + serialization | Pydantic v2 |
| **PostgreSQL** | Primary data store with row-level multi-tenancy | PostgreSQL 15 + SQLAlchemy 2 + Alembic |
| **Blob Storage** | Selfie photo storage (LGPD-compliant, cloud-agnostic) | Abstract interface: GCS / S3 / Local |
| **APScheduler** | In-process scheduler for payroll export cron jobs | APScheduler 3.x (AsyncIO) |
| **JWT Auth** | Stateless auth with extensible claims for Modules 2+3 | python-jose + passlib |

---

## Key Decisions

### Decision 1: Offline-First via IndexedDB + Workbox Background Sync

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-20 |

**Context:** Construction sites in Northern Brazil have unreliable connectivity. Check-ins must never fail due to network outage (confirmed in BRAINSTORM Q2).

**Choice:** Service Worker using Workbox Background Sync. Check-in requests are intercepted by the Service Worker; if offline, the request is stored in an IndexedDB queue (`checkin-queue`) and replayed automatically when connectivity is restored.

**Rationale:** Workbox Background Sync is production-mature, handles retry logic and queue persistence natively, and integrates cleanly with the React PWA via `vite-plugin-pwa`. The alternative (manual fetch + retry) requires reimplementing what Workbox already provides reliably.

**Alternatives Rejected:**
1. Online-only strict mode — rejected per BRAINSTORM decision; unacceptable for field conditions
2. Manual fetch with localStorage queue — rejected; less reliable than Service Worker, lost on browser close
3. React Native with SQLite — rejected per BRAINSTORM; MDM overhead and slower updates

**Consequences:** Service Worker requires Chrome 90+ or Safari 15+ (Assumption A-001 — validate tablet browser versions before deployment).

---

### Decision 2: Idempotency via Client-Generated UUID (event_id)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-20 |

**Context:** When the tablet's Background Sync replays queued requests after reconnect, the API may receive the same check-in multiple times (network retry scenarios). Creating duplicate records would corrupt attendance data.

**Choice:** Every check-in generates a `event_id` UUID on the client (using `crypto.randomUUID()`) before the first POST attempt. The API endpoint has a PostgreSQL UNIQUE constraint on `event_id`. Duplicate submissions return `200 OK` (not `409 Conflict`) to prevent the Workbox retry loop from treating a successful duplicate as a failure.

**Rationale:** Client-generated UUIDs eliminate the need for a server-side deduplication window or distributed lock. The UNIQUE constraint enforces correctness at the DB layer regardless of API instance count.

**Alternatives Rejected:**
1. Server-generated IDs — rejected; the server can't assign an ID to a request it hasn't received yet (offline scenario)
2. Timestamp-based deduplication window — rejected; clock skew on field tablets makes this unreliable
3. Returning `409 Conflict` on duplicate — rejected; Workbox would continue retrying, causing infinite loops

**Consequences:** Client must persist `event_id` in IndexedDB alongside the queued request. Slight increase in IndexedDB storage per entry (negligible).

---

### Decision 3: Row-Level Multi-Tenancy via PostgreSQL RLS

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-20 |

**Context:** Multiple construction sites must be isolated — a site admin on Site A must never see Site B data (AT-010). Enforcement must be at the data layer, not just the application layer.

**Choice:** PostgreSQL Row-Level Security (RLS) policies on all tenant-scoped tables. API connects with a DB role that has RLS enabled. JWT carries a `site_id` claim; the API sets `SET LOCAL app.current_site_id = ?` at query time. Central admins receive a wildcard claim that bypasses site filtering.

**Rationale:** RLS enforces isolation at the DB layer — a bug in application code cannot accidentally leak cross-site data. This is defense in depth. The `SET LOCAL` pattern is standard SQLAlchemy + PostgreSQL RLS usage.

**Alternatives Rejected:**
1. Application-layer `WHERE site_id = ?` filtering — rejected; one missed WHERE clause exposes all tenants
2. Separate database per site — rejected; impractical at scale, complex to manage for small sites

**Consequences:** All queries must propagate `site_id` through the call stack. Slightly more complex SQLAlchemy session setup. Central admin queries bypass RLS, requiring explicit trust.

---

### Decision 4: Extensible JWT Claims for Module 2+3 Integration

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-20 |

**Context:** The DEFINE document (constraint: "Auth layer must accommodate Modules 2 and 3 in future") requires a shared auth model. The same employee who checks in (Module 1) will also submit DFDRs (Module 2) and SPT data (Module 3).

**Choice:** JWT claims include a `modules` array alongside `user_id`, `site_id`, and `role`. Module 1 issues tokens with `"modules": ["attendance"]`. When Modules 2+3 are added, the same auth service extends tokens to `"modules": ["attendance", "dfdr", "spt"]` without breaking existing clients.

**Rationale:** Array-based module permissions are additive and backward-compatible. A Module 1 client ignores unknown module claims. A Module 2 client checks for `"dfdr"` in the array.

**Alternatives Rejected:**
1. Separate auth per module — rejected; forces re-login across modules, poor UX
2. Scope strings (OAuth-style) — viable alternative; array chosen for readability in this domain

**Consequences:** Auth service becomes a shared platform concern when Modules 2+3 are built. The `auth.py` module must be maintained as a shared library or extracted to a separate service.

---

### Decision 5: Cloud-Agnostic Storage Interface

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-20 |

**Context:** Cloud platform is TBD (OI-3 open). The system requires blob storage for selfie photos. Design cannot be blocked by this decision.

**Choice:** Define a `StorageBackend` abstract base class. Implementations: `GCSStorageBackend` (for GCP), `S3StorageBackend` (for AWS), `LocalStorageBackend` (for local dev). Active backend selected via `STORAGE_BACKEND` env var.

**Rationale:** Abstracts cloud storage behind an interface, allowing the cloud platform decision (OI-3) to be resolved independently and with zero code changes. `LocalStorageBackend` enables full local development without cloud credentials.

**Alternatives Rejected:**
1. GCS-only (assume GCP) — rejected; OI-3 is explicitly unresolved; hardcoding GCP is premature
2. Defer photo storage until platform is chosen — rejected; LGPD compliance requires designing the storage model now even if implementation is swapped

**Consequences:** Slightly more code than a direct GCS import. Backend must be validated in the Design phase when OI-3 is resolved.

---

### Decision 6: APScheduler In-Process for Payroll Export

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-20 |

**Context:** Payroll export must run on a configurable schedule (e.g., Fridays 18:00) and email .TXT/.CSV to HR — no manual download required.

**Choice:** APScheduler 3.x with AsyncIO scheduler running in-process with the FastAPI app. Each `export_schedule` row in the DB defines cron expression, recipient email, and format. The scheduler loads active schedules on startup and executes them.

**Rationale:** APScheduler is the standard Python in-process scheduler and integrates cleanly with FastAPI's lifespan context. For this use case (one export job per tenant per week) there's no need for a distributed task queue.

**Alternatives Rejected:**
1. Celery + Redis — rejected; significant operational overhead (two extra services) for a simple cron use case
2. Cloud-native scheduler (Cloud Scheduler, EventBridge) — rejected; cloud platform is TBD; also requires external HTTP trigger rather than in-process execution

**Consequences:** If the API has multiple replicas, multiple instances will attempt to run the same export job simultaneously. Mitigation: PostgreSQL advisory lock in the export job function (try lock → run → release; other instances skip if lock not acquired).

---

## Database Schema

```sql
-- Core tables (simplified; full schema in migration file)

CREATE TABLE sites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    address     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE employees (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     UUID NOT NULL REFERENCES sites(id),
    name        TEXT NOT NULL,
    email       TEXT,
    qr_code_id  UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),  -- encoded in QR
    pin_hash    TEXT NOT NULL,                                    -- bcrypt
    role        TEXT NOT NULL DEFAULT 'employee',                -- employee|site_admin|central_admin
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         UUID NOT NULL REFERENCES sites(id),
    name            TEXT NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    daily_hours     NUMERIC(4,2) NOT NULL DEFAULT 8.0,           -- CLT threshold
    weekly_hours    NUMERIC(5,2) NOT NULL DEFAULT 44.0,          -- CLT threshold
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE checkins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL UNIQUE,                        -- client-generated, idempotency key
    employee_id     UUID NOT NULL REFERENCES employees(id),
    site_id         UUID NOT NULL REFERENCES sites(id),
    occurred_at     TIMESTAMPTZ NOT NULL,                        -- client timestamp
    synced_at       TIMESTAMPTZ DEFAULT now(),                   -- server receipt time
    type            TEXT NOT NULL CHECK (type IN ('in', 'out')),
    gps_lat         NUMERIC(10,7),
    gps_lng         NUMERIC(10,7),
    photo_path      TEXT,                                        -- blob storage path
    is_overtime     BOOLEAN DEFAULT false,
    source          TEXT NOT NULL DEFAULT 'tablet'              -- tablet|admin_correction
);

CREATE TABLE attendance_edits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkin_id      UUID NOT NULL REFERENCES checkins(id),
    editor_id       UUID NOT NULL REFERENCES employees(id),
    field_changed   TEXT NOT NULL,
    old_value       TEXT,
    new_value       TEXT,
    reason          TEXT,
    edited_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE export_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         UUID REFERENCES sites(id),                  -- NULL = all sites (central admin)
    cron_expr       TEXT NOT NULL,                              -- e.g. '0 18 * * 5' (Fri 18:00)
    recipient_email TEXT NOT NULL,
    format          TEXT NOT NULL DEFAULT 'csv',               -- csv|txt
    is_active       BOOLEAN DEFAULT true,
    last_run_at     TIMESTAMPTZ
);

CREATE TABLE payroll_export_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id     UUID NOT NULL REFERENCES export_schedules(id),
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',           -- pending|success|failed
    file_path       TEXT,
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS setup
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_isolation ON checkins
    USING (site_id::text = current_setting('app.current_site_id', true)
           OR current_setting('app.current_site_id', true) = 'all');
-- (same pattern for employees, attendance_edits)
```

---

## File Manifest

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| **API** | | | | | |
| 1 | `src/attendance/api/main.py` | Create | FastAPI app factory, lifespan (scheduler start/stop), router mounting | @python-developer | 2, 3, 17 |
| 2 | `src/attendance/api/config.py` | Create | Pydantic BaseSettings — env vars, secrets, DB URL, storage backend | @python-developer | None |
| 3 | `src/attendance/api/database.py` | Create | SQLAlchemy async engine, session factory, RLS `SET LOCAL` middleware | @python-developer | 2 |
| 4 | `src/attendance/api/auth.py` | Create | JWT creation/validation, bcrypt PIN hashing, extensible claims (modules array) | @python-developer | 2 |
| 5 | `src/attendance/api/routers/auth.py` | Create | `POST /auth/login`, `POST /auth/refresh` | @python-developer | 4 |
| 6 | `src/attendance/api/routers/checkins.py` | Create | `POST /checkins` (idempotent), `POST /sync` (bulk idempotent) | @python-developer | 4, 11, 12 |
| 7 | `src/attendance/api/routers/employees.py` | Create | Employee CRUD + QR/PIN generation | @python-developer | 4, 13, 14 |
| 8 | `src/attendance/api/routers/reports.py` | Create | Point Mirror report + manual payroll export trigger | @python-developer | 4, 15 |
| 9 | `src/attendance/api/routers/sites.py` | Create | Site CRUD (central admin only) | @python-developer | 4 |
| 10 | `src/attendance/api/routers/shifts.py` | Create | Shift configuration CRUD per site | @python-developer | 4 |
| **Pydantic Models** | | | | | |
| 11 | `src/attendance/api/models/checkin.py` | Create | `CheckInRequest`, `CheckInResponse`, `SyncRequest`, `SyncResult` | @python-developer | None |
| 12 | `src/attendance/api/models/employee.py` | Create | `EmployeeCreate`, `EmployeeResponse`, `QRCodeResponse` | @python-developer | None |
| 13 | `src/attendance/api/models/report.py` | Create | `PointMirrorRequest`, `PointMirrorEntry`, `PayrollExportConfig` | @python-developer | None |
| 14 | `src/attendance/api/models/auth.py` | Create | `LoginRequest`, `TokenResponse`, `JWTClaims` | @python-developer | None |
| **Services** | | | | | |
| 15 | `src/attendance/api/services/checkin_service.py` | Create | Business logic: idempotency check, overtime flagging, photo storage call | @python-developer | 2, 3, 16 |
| 16 | `src/attendance/api/services/storage.py` | Create | `StorageBackend` ABC + `GCSStorageBackend`, `S3StorageBackend`, `LocalStorageBackend` | @python-developer | 2 |
| 17 | `src/attendance/api/services/report_service.py` | Create | Point Mirror PDF/HTML generation, .TXT/.CSV payroll formatting | @python-developer | 3 |
| 18 | `src/attendance/api/services/email_service.py` | Create | SMTP email sender for payroll export delivery | @python-developer | 2 |
| 19 | `src/attendance/api/services/qr_service.py` | Create | QR Code generation (base64 PNG) using `qrcode` library | @python-developer | None |
| 20 | `src/attendance/api/scheduler.py` | Create | APScheduler setup, export job (with PostgreSQL advisory lock), schedule loader | @python-developer | 2, 3, 17, 18 |
| **Database** | | | | | |
| 21 | `src/attendance/db/models.py` | Create | SQLAlchemy ORM models (all tables) | @python-developer | None |
| 22 | `src/attendance/db/migrations/env.py` | Create | Alembic env.py with async engine | @python-developer | 21 |
| 23 | `src/attendance/db/migrations/001_initial_schema.sql` | Create | Full schema + RLS policies + indexes | @python-developer | None |
| 24 | `src/attendance/db/alembic.ini` | Create | Alembic configuration | @python-developer | None |
| **PWA** | | | | | |
| 25 | `src/attendance/pwa/package.json` | Create | React 18, Workbox, vite-plugin-pwa, idb, @zxing/browser (QR scan) | (general) | None |
| 26 | `src/attendance/pwa/vite.config.ts` | Create | Vite + vite-plugin-pwa (Service Worker manifest, Workbox BG sync config) | (general) | 25 |
| 27 | `src/attendance/pwa/src/main.tsx` | Create | React entrypoint + Service Worker registration | (general) | 26 |
| 28 | `src/attendance/pwa/src/App.tsx` | Create | Router: `/checkin` route, offline banner | (general) | None |
| 29 | `src/attendance/pwa/src/pages/CheckIn.tsx` | Create | Step flow: QR scan → PIN → selfie → GPS → submit (with offline queuing) | (general) | 30, 31, 32, 33, 34 |
| 30 | `src/attendance/pwa/src/components/QRScanner.tsx` | Create | Camera-based QR scanning using `@zxing/browser` | (general) | None |
| 31 | `src/attendance/pwa/src/components/PinPad.tsx` | Create | 4-digit PIN entry keypad (large touch targets for field use) | (general) | None |
| 32 | `src/attendance/pwa/src/components/SelfieCapture.tsx` | Create | Front-facing camera capture, preview + confirm flow | (general) | None |
| 33 | `src/attendance/pwa/src/services/checkinQueue.ts` | Create | IndexedDB queue using `idb` library, `enqueue()`, `getQueue()`, `clearSynced()` | (general) | None |
| 34 | `src/attendance/pwa/src/services/api.ts` | Create | API client: `POST /checkins`, attach JWT, handle 200 on duplicate | (general) | None |
| **Admin Dashboard** | | | | | |
| 35 | `src/attendance/admin/package.json` | Create | React 18, React Router, Tanstack Query, Tailwind CSS | (general) | None |
| 36 | `src/attendance/admin/src/App.tsx` | Create | Router: employees, attendance, reports, settings, login | (general) | None |
| 37 | `src/attendance/admin/src/pages/Employees.tsx` | Create | Employee list, create form, QR Code display + download, PIN reveal | (general) | None |
| 38 | `src/attendance/admin/src/pages/Attendance.tsx` | Create | Attendance records table, inline edit with reason, audit log drawer | (general) | None |
| 39 | `src/attendance/admin/src/pages/Reports.tsx` | Create | Point Mirror date-range picker + preview, payroll export manual trigger | (general) | None |
| 40 | `src/attendance/admin/src/pages/Settings.tsx` | Create | Shift config, export schedule (cron + email), site management | (general) | None |
| **Infrastructure** | | | | | |
| 41 | `src/attendance/docker-compose.yml` | Create | Local dev: FastAPI API + PostgreSQL 15 + pgAdmin | @infra-deployer | None |
| 42 | `src/attendance/api/Dockerfile` | Create | Python 3.11-slim, multi-stage build, non-root user | @infra-deployer | None |
| 43 | `src/attendance/config/app.yaml` | Create | All tunables: DB, SMTP, storage backend, JWT TTL, export defaults | @infra-deployer | None |
| **Tests** | | | | | |
| 44 | `src/attendance/api/tests/conftest.py` | Create | pytest fixtures: async test DB, test client, factory functions | @test-generator | 3, 21 |
| 45 | `src/attendance/api/tests/test_checkins.py` | Create | AT-001 to AT-004, AT-011, AT-012 — happy path, offline queue, idempotency, unknown QR | @test-generator | 6, 44 |
| 46 | `src/attendance/api/tests/test_sync.py` | Create | AT-003 — bulk sync, duplicate prevention, partial success | @test-generator | 6, 44 |
| 47 | `src/attendance/api/tests/test_reports.py` | Create | AT-006, AT-007 — Point Mirror generation, payroll export delivery | @test-generator | 8, 44 |
| 48 | `src/attendance/api/tests/test_auth.py` | Create | Login, token refresh, JWT claims validation, RLS isolation (AT-010) | @test-generator | 5, 44 |
| 49 | `src/attendance/api/tests/test_overtime.py` | Create | AT-008 — overtime flagging at daily/weekly thresholds | @test-generator | 15, 44 |

**Total Files:** 49

---

## Agent Assignment Rationale

| Agent | Files Assigned | Why This Agent |
|-------|----------------|----------------|
| @python-developer | 1–24, 44–49 (backend + tests) | Python/FastAPI/SQLAlchemy patterns; Pydantic v2 models; pytest |
| @test-generator | 44–49 | pytest specialist; AT-based test design; async fixtures |
| @infra-deployer | 41–43 | Docker + compose patterns; IaC config structure |
| (general) | 25–40 (React PWA + Admin) | No React specialist in agent registry; handled directly |

---

## Code Patterns

### Pattern 1: Idempotent Check-In Endpoint

```python
# src/attendance/api/routers/checkins.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from ..models.checkin import CheckInRequest, CheckInResponse
from ..services.checkin_service import CheckInService
from ..auth import get_current_user

router = APIRouter(prefix="/checkins", tags=["checkins"])

@router.post("", response_model=CheckInResponse)
async def create_checkin(
    payload: CheckInRequest,
    service: CheckInService = Depends(),
    current_user = Depends(get_current_user),
):
    try:
        result = await service.record_checkin(payload, site_id=current_user.site_id)
        return result
    except IntegrityError:
        # Duplicate event_id — already recorded; return existing record silently
        existing = await service.get_by_event_id(payload.event_id)
        return existing  # 200 OK, not 409
```

### Pattern 2: Pydantic CheckIn Model

```python
# src/attendance/api/models/checkin.py
from pydantic import BaseModel, UUID4, Field
from datetime import datetime
from typing import Literal

class CheckInRequest(BaseModel):
    event_id: UUID4                          # client-generated idempotency key
    employee_qr_id: UUID4                    # scanned from QR Code
    pin: str = Field(min_length=4, max_length=4)
    type: Literal["in", "out"]
    occurred_at: datetime                    # client-side timestamp (ISO 8601 + TZ)
    gps_lat: float | None = None
    gps_lng: float | None = None
    photo_base64: str | None = None         # base64-encoded JPEG selfie

class CheckInResponse(BaseModel):
    id: UUID4
    event_id: UUID4
    employee_id: UUID4
    occurred_at: datetime
    is_overtime: bool
    synced_at: datetime

class SyncRequest(BaseModel):
    events: list[CheckInRequest] = Field(max_length=500)  # max bulk batch

class SyncResult(BaseModel):
    accepted: int
    duplicates: int
    rejected: list[dict]                    # [{event_id, reason}]
```

### Pattern 3: Storage Backend Interface

```python
# src/attendance/api/services/storage.py
from abc import ABC, abstractmethod
from pathlib import Path

class StorageBackend(ABC):
    @abstractmethod
    async def upload(self, path: str, data: bytes, content_type: str) -> str:
        """Upload bytes; return the storage path."""

    @abstractmethod
    async def get_signed_url(self, path: str, expires_in: int = 3600) -> str:
        """Return a time-limited readable URL."""

    @abstractmethod
    async def delete(self, path: str) -> None:
        """LGPD: permanent deletion on data subject request."""


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_dir: str = "/tmp/attendance_photos"):
        self.base = Path(base_dir)
        self.base.mkdir(parents=True, exist_ok=True)

    async def upload(self, path: str, data: bytes, content_type: str) -> str:
        dest = self.base / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return path

    async def get_signed_url(self, path: str, expires_in: int = 3600) -> str:
        return f"/dev/photos/{path}"  # local dev only

    async def delete(self, path: str) -> None:
        (self.base / path).unlink(missing_ok=True)


def get_storage_backend(settings) -> StorageBackend:
    match settings.storage_backend:
        case "gcs":
            from .gcs_storage import GCSStorageBackend
            return GCSStorageBackend(settings.gcs_bucket)
        case "s3":
            from .s3_storage import S3StorageBackend
            return S3StorageBackend(settings.s3_bucket)
        case _:
            return LocalStorageBackend(settings.local_storage_path)
```

### Pattern 4: JWT with Extensible Module Claims

```python
# src/attendance/api/auth.py
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from pydantic import BaseModel
from typing import Literal

class JWTClaims(BaseModel):
    sub: str                    # user_id
    site_id: str | None         # None = central admin (bypasses RLS)
    role: Literal["employee", "site_admin", "central_admin"]
    modules: list[str]          # ["attendance"] — extend to add dfdr, spt

def create_access_token(claims: JWTClaims, secret: str, ttl_minutes: int = 15) -> str:
    payload = {
        **claims.model_dump(),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def decode_token(token: str, secret: str) -> JWTClaims:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return JWTClaims(**payload)
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")
```

### Pattern 5: APScheduler Payroll Export with Advisory Lock

```python
# src/attendance/api/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncpg

scheduler = AsyncIOScheduler()

async def run_payroll_export(schedule_id: str, db_pool):
    async with db_pool.acquire() as conn:
        # PostgreSQL advisory lock — only one replica executes per schedule_id
        lock_key = hash(schedule_id) % (2**31)
        acquired = await conn.fetchval(
            "SELECT pg_try_advisory_lock($1)", lock_key
        )
        if not acquired:
            return  # Another instance is running this job

        try:
            await _execute_export(schedule_id, conn)
        finally:
            await conn.execute("SELECT pg_advisory_unlock($1)", lock_key)

async def load_schedules(db_pool):
    async with db_pool.acquire() as conn:
        schedules = await conn.fetch(
            "SELECT id, cron_expr FROM export_schedules WHERE is_active = true"
        )
    for s in schedules:
        scheduler.add_job(
            run_payroll_export,
            CronTrigger.from_crontab(s["cron_expr"]),
            args=[str(s["id"]), db_pool],
            id=str(s["id"]),
            replace_existing=True,
        )
```

### Pattern 6: IndexedDB Offline Queue (TypeScript)

```typescript
// src/attendance/pwa/src/services/checkinQueue.ts
import { openDB, IDBPDatabase } from 'idb';

interface QueuedCheckin {
  eventId: string;
  payload: CheckInRequest;
  queuedAt: number;
  attempts: number;
}

const DB_NAME = 'prossolo-attendance';
const STORE = 'checkin-queue';

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: 'eventId' });
    },
  });
}

export async function enqueue(payload: CheckInRequest): Promise<void> {
  const db = await getDB();
  await db.put(STORE, {
    eventId: payload.event_id,
    payload,
    queuedAt: Date.now(),
    attempts: 0,
  });
}

export async function getQueue(): Promise<QueuedCheckin[]> {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function removeFromQueue(eventId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, eventId);
}
```

### Pattern 7: Application Configuration (YAML)

```yaml
# src/attendance/config/app.yaml
database:
  url: "${DATABASE_URL}"            # env override
  pool_size: 10
  max_overflow: 5

auth:
  secret_key: "${JWT_SECRET_KEY}"   # env override — never in file
  access_token_ttl_minutes: 15
  refresh_token_ttl_days: 7

storage:
  backend: "${STORAGE_BACKEND:local}"  # local | gcs | s3
  local_path: "/tmp/attendance_photos"
  gcs_bucket: "${GCS_BUCKET:}"
  s3_bucket: "${S3_BUCKET:}"

email:
  smtp_host: "${SMTP_HOST:smtp.gmail.com}"
  smtp_port: 587
  smtp_user: "${SMTP_USER}"
  smtp_password: "${SMTP_PASSWORD}"
  from_address: "noreply@prossolo.com.br"

payroll_export:
  default_format: "csv"
  default_encoding: "utf-8"
  max_period_days: 31

pin:
  length: 4
  max_failed_attempts: 3
  lockout_minutes: 15
```

---

## Data Flow

### Check-In Flow (Online)

```text
1. Employee opens PWA on tablet → Camera activates
   │
   ▼
2. QR Scanner reads employee QR Code → extracts qr_code_id (UUID)
   │
   ▼
3. Employee enters 4-digit PIN on PinPad component
   │
   ▼
4. Employee takes selfie → captured as JPEG blob
   │
   ▼
5. Browser calls navigator.geolocation.getCurrentPosition() → GPS coords
   │
   ▼
6. Client generates event_id = crypto.randomUUID()
   Builds CheckInRequest { event_id, qr_code_id, pin, type, occurred_at, gps, photo_base64 }
   │
   ▼
7. POST /api/v1/checkins (Service Worker intercepts)
   │
   ├─ If ONLINE → request passes through to API
   │       │
   │       ▼
   │  8a. API: validate PIN (bcrypt verify against employee record)
   │       │
   │       ▼
   │  8b. API: upload selfie to blob storage → photo_path
   │       │
   │       ▼
   │  8c. API: INSERT INTO checkins (UNIQUE on event_id)
   │       │
   │       ▼
   │  8d. API: check overtime thresholds → set is_overtime flag
   │       │
   │       ▼
   │  8e. Return 200 CheckInResponse → PWA shows ✓ confirmation
   │
   └─ If OFFLINE → Workbox queues request in IndexedDB
           │
           ▼
      PWA shows "✓ Saved offline — will sync automatically"
           │
           ▼
      [Later] Connectivity restored → Workbox Background Sync
      replays all queued requests → steps 8a-8e execute
      Duplicates handled by IntegrityError catch → 200 OK
```

### Payroll Export Flow

```text
1. APScheduler fires cron job for active export_schedule
   │
   ▼
2. Acquire PostgreSQL advisory lock (skip if lock held by another replica)
   │
   ▼
3. Query checkins for period (start_date, end_date, site_id)
   │
   ▼
4. Format as .TXT or .CSV per configured schema
   │
   ▼
5. Send via SMTP as email attachment to recipient_email
   │
   ▼
6. INSERT INTO payroll_export_runs (status=success, file_path)
   │
   ▼
7. UPDATE export_schedules SET last_run_at = now()
   │
   ▼
8. Release advisory lock
```

---

## Integration Points

| External System | Integration Type | Authentication | Status |
|-----------------|-----------------|----------------|--------|
| Blob Storage (GCS/S3/Local) | SDK (cloud-agnostic backend) | Service account / IAM role / none (local) | Backend TBD (OI-3) |
| SMTP Email Server | SMTP (smtplib/aiosmtplib) | Username + password (env var) | Config in app.yaml |
| PostgreSQL | SQLAlchemy async | DB password (env var) | Self-hosted or managed |
| QR Code Library (`qrcode`) | Python library (no network call) | N/A | Synchronous, local |

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage Goal |
|-----------|-------|-------|-------|---------------|
| Unit | Service functions (checkin_service, report_service, qr_service) | `test_checkins.py`, `test_reports.py` | pytest + pytest-asyncio | 85% of service layer |
| Integration | API endpoints with real test DB (not mocked) | All `test_*.py` | pytest + httpx AsyncClient + test PostgreSQL | All 12 acceptance tests |
| Idempotency | Duplicate event_id submission (AT-011) | `test_sync.py` | pytest | Must pass |
| Multi-tenancy | RLS isolation between sites (AT-010) | `test_auth.py` | pytest | Must pass |
| Overtime | Threshold detection (AT-008) | `test_overtime.py` | pytest | Must pass |
| E2E | Full check-in flow on tablet browser | Manual on hardware tablet | Chrome DevTools offline simulation | Happy path + offline |

**Test Database Strategy:** Tests use a real PostgreSQL instance (via `docker-compose up -d db` in CI). No mocked DB — per BRAINSTORM learnings and to ensure RLS policies actually execute.

---

## Error Handling

| Error Type | Handling Strategy | Retry? |
|------------|-------------------|--------|
| Duplicate `event_id` (IntegrityError) | Catch IntegrityError, fetch existing record, return 200 | No (already recorded) |
| Invalid PIN | Return 401; increment failed_attempts counter; lock after 3 attempts | No |
| Unknown QR Code (`qr_code_id` not found) | Return 404 with "Employee not found" | No |
| GPS unavailable | Accept check-in with null GPS fields; log warning | No |
| Selfie upload failure (blob storage) | Log error; save check-in record without photo; flag for manual review | No |
| SMTP delivery failure (payroll export) | Log error; update `payroll_export_runs.status = 'failed'`; retry on next scheduled run | Next schedule |
| Advisory lock held (duplicate scheduler) | Log info; skip execution; no error raised | No |
| Token expired | Return 401; PWA refreshes token via `/auth/refresh` | Yes (token refresh) |

---

## Security Considerations

- **PIN storage:** bcrypt-hashed (never stored in plaintext); hash stored in `employees.pin_hash`
- **JWT secret:** Loaded from env var (`JWT_SECRET_KEY`), never committed to source; rotatable
- **Selfie photos:** Stored at randomized paths (`{site_id}/{employee_id}/{event_id}.jpg`), not directly web-accessible; accessed via signed URLs with TTL
- **LGPD compliance:** `StorageBackend.delete()` provides hard deletion path for data subject requests; audit log records all data access
- **RLS:** PostgreSQL Row-Level Security prevents cross-site data access at the DB layer (defense in depth beyond application-layer filtering)
- **PIN lockout:** 3 failed attempts triggers 15-minute lockout to prevent brute-force via tablet
- **HTTPS only:** All API endpoints require TLS; PWA only served over HTTPS (Service Worker requirement)
- **Photo base64 in transit:** Selfie photos are base64-encoded in the JSON payload; maximum selfie size should be validated client-side (< 500KB) to prevent DoS

---

## Observability

| Aspect | Implementation |
|--------|----------------|
| Logging | Structured JSON via Python `logging` + `structlog`; fields: `event_id`, `employee_id`, `site_id`, `action`, `duration_ms` |
| Metrics | Custom counters: `checkins_total`, `checkins_offline_synced`, `export_runs_total`, `export_failures_total` |
| Health | `GET /health` endpoint: DB connectivity + scheduler status |
| Audit | All attendance edits written to `attendance_edits` table (tamper-evident, never deleted) |
| Export log | All payroll export attempts recorded in `payroll_export_runs` with status + error message |

---

## Configuration Summary

| Config Key | Type | Default | Description |
|------------|------|---------|-------------|
| `DATABASE_URL` | string | — | PostgreSQL async URL (`postgresql+asyncpg://...`) |
| `JWT_SECRET_KEY` | string | — | HS256 signing secret (min 32 chars) |
| `STORAGE_BACKEND` | string | `local` | `local` \| `gcs` \| `s3` |
| `SMTP_HOST` | string | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_USER` | string | — | SMTP auth username |
| `SMTP_PASSWORD` | string | — | SMTP auth password (env only) |
| `ACCESS_TOKEN_TTL` | int | `15` | JWT access token TTL in minutes |
| `REFRESH_TOKEN_TTL_DAYS` | int | `7` | Refresh token TTL in days |
| `PIN_MAX_ATTEMPTS` | int | `3` | Failed PIN attempts before lockout |
| `MAX_SELFIE_KB` | int | `500` | Maximum selfie size in KB |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-20 | design-agent | Initial design from DEFINE_ATTENDANCE_SYSTEM.md |

---

## Next Step

**Ready for:** `/build .claude/sdd/features/DESIGN_ATTENDANCE_SYSTEM.md`
