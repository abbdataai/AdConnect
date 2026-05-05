# DEFINE: Workforce Management & Attendance System (Module 1)

> Replace Prossolo's paper-based multi-site attendance process with an offline-first PWA that captures check-ins on site tablets, queues records locally, syncs to a central cloud backend, and delivers automated payroll exports on schedule.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ATTENDANCE_SYSTEM |
| **Date** | 2026-04-20 |
| **Author** | define-agent |
| **Status** | ✅ Shipped |
| **Clarity Score** | 15/15 |
| **Source** | `.claude/sdd/features/BRAINSTORM_ATTENDANCE_SYSTEM.md` |

---

## Problem Statement

Prossolo operates multiple simultaneous construction sites in Northern Brazil where employee attendance is tracked entirely on paper — creating data fidelity risks, manual payroll transcription overhead, and zero real-time visibility across sites. The absence of digital records makes overtime verification, compliance auditing, and payroll processing slow and error-prone.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| Field Employee | Construction worker at a site | Must check in physically; paper logs can be lost or misread |
| Site Admin / Supervisor | Manages daily operations at one site | Manually collates paper attendance; no visibility into late arrivals or absences in real time |
| HR / Payroll Staff | Processes payroll centrally | Manually transcribes paper attendance into payroll software; error-prone and time-consuming |
| Management | Oversees all active sites | No cross-site attendance visibility; relies on manual reports from each site |
| New Employee | Recently hired field worker | PIN onboarding via paper process is slow; first-day access depends on admin availability |

---

## Goals

| Priority | Goal |
|----------|------|
| **MUST** | Employees can check in on a site tablet using QR Code + 4-digit PIN in under 15 seconds |
| **MUST** | Check-ins succeed and persist locally when the tablet has no internet (offline-first) |
| **MUST** | All queued offline records sync automatically within 5 minutes of connectivity being restored |
| **MUST** | Admin can manage employees, sites, and shifts from a web dashboard |
| **MUST** | System generates Point Mirror reports per employee/site/period on demand |
| **MUST** | Scheduled payroll export (.TXT/.CSV) is automatically emailed to HR on a configured schedule |
| **SHOULD** | Each check-in captures a selfie photo (stored, not matched) and GPS coordinates |
| **SHOULD** | Admin can directly edit attendance records with a full immutable audit log |
| **SHOULD** | Overtime is automatically flagged when daily/weekly hour thresholds are exceeded |
| **SHOULD** | Multi-site isolation — site admins see only their site's data; central admins see all |
| **COULD** | Admin dashboard shows attendance analytics (rates, overtime trends, late arrivals) |
| **COULD** | QR Codes support optional periodic rotation policy |
| **COULD** | Export format is configurable (column names, delimiter, encoding) |

---

## Success Criteria

- [ ] Employee completes a full check-in (QR scan + PIN + selfie + GPS) in ≤ 15 seconds on the site tablet
- [ ] Check-in is stored locally and confirmed to the employee within 3 seconds even with no internet
- [ ] All locally queued records sync to the cloud backend within 5 minutes of connectivity restoration, with zero data loss
- [ ] Admin generates a Point Mirror report for any employee/period in ≤ 60 seconds
- [ ] Payroll .TXT/.CSV file is automatically delivered to the configured HR email address on schedule, without manual intervention
- [ ] Zero attendance records are lost due to document misplacement (baseline: paper logs)
- [ ] New employee is fully onboarded (QR Code + PIN generated and delivered) in ≤ 2 minutes by an admin
- [ ] System correctly flags overtime when an employee exceeds configured shift thresholds
- [ ] All attendance record edits are captured in a tamper-evident audit log with editor identity and timestamp

---

## Acceptance Tests

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| AT-001 | Happy path check-in (online) | Employee exists in system; tablet has internet; shift is active | Employee scans QR + enters PIN + takes selfie | Check-in record is saved to cloud; confirmation shown in ≤ 3 seconds; GPS coords captured |
| AT-002 | Offline check-in | Tablet has no internet connectivity | Employee scans QR + enters PIN + takes selfie | Check-in stored in local IndexedDB queue; confirmation shown; sync icon indicates pending |
| AT-003 | Sync on reconnect | 5 queued offline check-ins in IndexedDB | Tablet regains internet | All 5 records sync to cloud within 5 minutes; local queue cleared; no duplicates created |
| AT-004 | Wrong PIN | Employee scans valid QR code | Employee enters incorrect PIN 3 times | Account temporarily locked; admin notified; clear error message displayed |
| AT-005 | New employee onboarding | Admin is logged into dashboard | Admin creates employee record | QR Code and PIN generated; PIN displayed in-app and sent via email; employee can check in immediately |
| AT-006 | Point Mirror generation | 30 days of attendance records exist for employee | Admin requests Point Mirror for employee + date range | PDF/printable report generated in ≤ 60 seconds with all check-in/check-out times |
| AT-007 | Payroll export delivery | Scheduled export configured for Fridays 18:00 | Scheduler triggers at configured time | .TXT/.CSV file generated with correct schema; delivered to HR email; delivery confirmed in system log |
| AT-008 | Overtime flagging | Employee shift configured as 8h/day | Employee checks out after 10 hours | Record flagged as overtime (+2h); visible in admin dashboard and included in payroll export |
| AT-009 | Admin attendance correction | Admin edits a check-in time | Admin changes check-in from 08:05 to 08:00 and saves | Original value, new value, editor identity, and timestamp written to immutable audit log |
| AT-010 | Multi-site isolation | Admin A manages Site 1; Admin B manages Site 2 | Admin A logs into dashboard | Admin A sees only Site 1 employees and records; Site 2 data not accessible |
| AT-011 | Duplicate sync prevention | Same offline check-in record synced twice (network retry) | System receives duplicate sync request | Idempotency check detects duplicate; second write silently discarded; no duplicate record created |
| AT-012 | Unknown QR Code | Tablet is online | Unregistered QR Code is scanned | Check-in rejected; "Employee not found" error displayed; attempt logged with timestamp |

---

## Out of Scope (MVP)

- **GPS Geofencing enforcement** — GPS coordinates are captured and stored, but no radius boundary rules are applied. Enforcement deferred to v2.
- **WhatsApp Business API PIN delivery** — PIN is generated and displayed in-app or emailed. WhatsApp integration deferred to v2.
- **Bank of Hours (Banco de Horas) full CLT engine** — Overtime hours are flagged and recorded. Full CLT Bank of Hours balancing with compensation rules deferred to v2 (requires HR/legal sign-off on CLT agreements).
- **Biometric liveness detection / automated face matching** — Selfie photos are captured and stored for manual audit. No automated matching performed in MVP.
- **Formal multi-step exception approval workflow UI** — Admin directly edits attendance records; full approval routing workflow deferred to v2.
- **Cross-module integration with Module 2 (DFDR) and Module 3 (SPT)** — Shared auth and data model designed for future integration, but cross-module features are not in Module 1 scope.
- **Analytics dashboard** — Reporting is limited to Point Mirrors and payroll exports. Attendance trend analytics deferred to v2.

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| Technical | PWA requires Service Worker support: Chrome 90+ or Safari 15+ | Tablet browser version must be verified at each site during onboarding |
| Technical | Offline-first IndexedDB queue must handle concurrent writes (multiple employees checking in simultaneously) | Sync logic must be idempotent with conflict resolution strategy |
| Technical | Project lives in `src/attendance/` within the current monorepo | Directory structure: `src/attendance/pwa/`, `src/attendance/admin/`, `src/attendance/api/`, `src/attendance/db/` |
| Stack | React (PWA + Admin) + Python/FastAPI + PostgreSQL | All component design must conform to this stack |
| Cloud | Cloud platform TBD — must be confirmed in Design phase | Backend design should prefer containerized/cloud-agnostic patterns until platform is selected |
| Compliance | Biometric selfie photos classified as sensitive personal data under LGPD | Data retention, access controls, and deletion policy must be defined before go-live (see OI-2) |
| Compliance | Overtime and shift calculations must comply with Brazilian CLT | CLT overtime thresholds per employee category must be defined by HR/Legal before development (see OI-6) |
| Platform | Auth layer must be designed to accommodate Modules 2 and 3 in future | Use a shared JWT/auth pattern; avoid attendance-specific user model that can't be extended |
| Integration | Payroll export schema must match target payroll software's expected format | Schema cannot be finalized until payroll software is identified (see OI-1) |

---

## Technical Context

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location** | `src/attendance/` | Subdirectory in current repo; subfolders: `pwa/`, `admin/`, `api/`, `db/` |
| **Stack** | React + Python/FastAPI + PostgreSQL | PWA and Admin in React; REST API in FastAPI; PostgreSQL for persistence |
| **KB Domains** | `gcp`, `terraform/terragrunt` | GCP for cloud infra (when platform confirmed); Terraform for IaC provisioning |
| **IaC Impact** | New resources required — TBD pending cloud platform decision | Likely: compute (Cloud Run or equivalent), managed PostgreSQL, blob storage for selfies, scheduler for payroll export |

**Project Structure (Proposed):**

```
src/attendance/
├── pwa/              # React PWA — tablet check-in app (Service Worker + IndexedDB)
├── admin/            # React Admin Dashboard — roster, reports, exports
├── api/              # Python/FastAPI — REST API, sync endpoint, scheduler
└── db/               # Alembic migrations — PostgreSQL schema
```

---

## Assumptions

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| A-001 | Site tablets run Chrome 90+ or Safari 15+ (Service Worker support) | PWA offline-first would fail; fallback to native app or older browsers required | [ ] |
| A-002 | Each site tablet is dedicated in kiosk mode — not a shared personal device | Security model changes significantly if tablet is personal; PIN + QR must be strengthened | [ ] |
| A-003 | PostgreSQL can handle expected data volume (~100 employees × 2 check-ins/day × N sites) | At very large scale (>10,000 employees), partitioning strategy needed | [ ] |
| A-004 | HR's payroll software accepts file delivery via email attachment | If SFTP or API is required, delivery mechanism changes; schema may also differ | [ ] |
| A-005 | CLT overtime is > 8 hours/day or > 44 hours/week for standard employees | If CLT regime is different (e.g., 12×36 shift), overtime engine must be reconfigured | [ ] |
| A-006 | Site admins have internet access for the admin dashboard even when tablet is in offline-first mode | If admins are also offline, real-time reporting is not possible; async report generation needed | [ ] |
| A-007 | Average selfie photo size is ~300KB; at 100 employees × 2 check-ins/day → ~60MB/day → ~22GB/year | If volume is higher (more sites, more employees), blob storage cost and retention policy must be revisited | [ ] |
| A-008 | Each construction site has a stable, unique identifier (site ID) for multi-tenant isolation | If sites are created/decommissioned frequently, site lifecycle management adds scope | [ ] |

---

## Open Items (Must Resolve Before Build)

| # | Item | Owner | Priority |
|---|------|-------|----------|
| OI-1 | Identify payroll software and capture exact .TXT/.CSV field schema (column names, types, order, encoding) | HR / Finance | CRITICAL |
| OI-2 | Define LGPD data retention, access, and deletion policy for selfie photos | Legal | CRITICAL |
| OI-3 | Confirm cloud platform (GCP, AWS, Firebase/Supabase) | Management / Tech Lead | CRITICAL |
| OI-4 | Define overtime thresholds per CLT employee category applicable to Prossolo workforce | HR / Legal | HIGH |
| OI-5 | Confirm number of active sites and tablet hardware procurement plan | Operations | HIGH |
| OI-6 | Define Point Mirror report layout (CLT-mandated or company standard) | HR / Legal | HIGH |
| OI-7 | Define payroll export schedule (day, time, recipient email) | HR | HIGH |
| OI-8 | Define QR Code format (static vs. periodically rotated) and rotation policy if applicable | Tech Lead | MEDIUM |
| OI-9 | Define GPS coordinate storage precision (decimal degrees, WGS84 assumed) | Tech Lead | MEDIUM |
| OI-10 | Confirm tablet browser versions currently in use or to be procured | Operations | MEDIUM |

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| Problem | 3 | Specific pain (paper-based, multi-site, no visibility), quantifiable baseline, named users |
| Users | 3 | 5 personas with concrete pain points; primary user (field employee) is clear |
| Goals | 3 | Full MoSCoW priority set; all MUST goals are non-negotiable and testable |
| Success | 3 | All criteria are measurable with numbers (15s, 5min, 60s, 2min) |
| Scope | 3 | 7 explicit out-of-scope items; 10 open items with owners and priority |
| **Total** | **15/15** | Ready for Design |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-20 | define-agent | Initial version from BRAINSTORM_ATTENDANCE_SYSTEM.md |

---

## Next Step

**Ready for:** `/design .claude/sdd/features/DEFINE_ATTENDANCE_SYSTEM.md`
