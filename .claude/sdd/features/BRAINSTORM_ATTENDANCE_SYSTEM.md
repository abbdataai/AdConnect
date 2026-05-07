# BRAINSTORM: Workforce Management & Attendance System (Module 1)

> Exploratory session to clarify intent and approach before requirements capture

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ATTENDANCE_SYSTEM |
| **Date** | 2026-04-20 |
| **Author** | brainstorm-agent |
| **Status** | ✅ Complete (Defined) |
| **Source** | notes/summary-requirements.md (kickoff extraction) |

---

## Initial Idea

**Raw Input:** Brainstorm the entire Module 1 – Workforce Management & Attendance System

**Context Gathered:**
- Prossolo is a Foundations Engineering firm (est. 1988) operating across multiple construction sites in Northern Brazil
- Current attendance process is 100% paper-based
- Kickoff proposes: fixed tablet PoP, QR Code + PIN, selfie + GPS, WhatsApp PIN delivery, overtime/Bank of Hours, Point Mirror + CSV/TXT payroll export
- No existing digital systems confirmed; no sample attendance sheets or payroll schemas available
- Module 1 must integrate into a unified SaaS platform alongside Module 2 (DFDR) and Module 3 (SPT)

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location | New greenfield SaaS product | Full-stack design required |
| Relevant Constraints | LGPD (biometric data), CLT (labor law), multi-site field connectivity | Compliance and offline-first are non-negotiable |
| Platform Goal | Unified ecosystem (Modules 1+2+3) | Shared auth, shared cloud backend, consistent data model |
| Deployment Context | Low-cost tablets at Northern Brazil construction sites | Connectivity unreliable → offline-first mandatory |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | How many locations need attendance tracking? | Multiple active construction sites simultaneously — each site needs its own tablet | Multi-site architecture required; each tablet is an independent PoP syncing to central cloud |
| 2 | What's the acceptable behavior when a site tablet loses internet? | Check-ins queue locally and sync when connectivity is restored (offline-first) | Offline-first is a hard requirement; local IndexedDB queue + background sync mandatory |
| 3 | How should payroll integration work? | Scheduled automatic export — system emails or deposits file on a configured schedule | Scheduled job (e.g., Fridays 18:00) generates .TXT/.CSV and emails to configured HR address; no manual download required |
| 4 | Are sample attendance sheets or payroll schemas available? | Neither — define from scratch | Data schema must be designed from CLT requirements and HR input in Define phase |

---

## Sample Data Inventory

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Paper attendance sheet | N/A | 0 | Not available; schema to be defined from CLT requirements |
| Payroll .TXT/.CSV schema | N/A | 0 | Payroll software not yet identified; schema to be captured in Define phase |
| Ground truth | N/A | 0 | No baseline data available |
| Related code | N/A | 0 | Greenfield project |

**Impact:** No samples available. Define phase must capture payroll software name and required field schema from HR/Finance before development begins.

---

## Approaches Explored

### Approach A: Progressive Web App (PWA) + Cloud Backend ⭐ Recommended

**Description:** A PWA installed on the site tablet browser (Chrome/Safari). Uses Service Workers + IndexedDB for offline check-in queuing. Central REST API + cloud database aggregates records from all sites.

**Pros:**
- No app store deployment — install via browser URL, updates are instant across all tablets
- True offline-first: Service Workers + IndexedDB queue check-ins locally, background sync on reconnect
- Works on any commodity Android/iOS tablet without MDM
- Lower build cost and operational overhead vs. native

**Cons:**
- Camera/GPS require explicit browser permission grant on first launch (one-time setup)
- Slightly less native feel than compiled app
- Service Worker support depends on browser (well-supported on Chrome 90+ / Safari 15+)

**Why Recommended:** Multi-site field deployment with unreliable connectivity makes PWA + offline queue the pragmatic choice. No app store friction, instant over-the-air updates, and Service Workers are production-mature for this use case.

---

### Approach B: Native App (React Native / Flutter)

**Description:** Compiled native app deployed to tablets via MDM or direct APK sideload (Android) or TestFlight/Enterprise cert (iOS).

**Pros:**
- Full native hardware access for camera, GPS, biometrics
- Native SQLite for reliable offline storage

**Cons:**
- Requires MDM setup or manual APK distribution to each site — operational overhead at every site deployment
- Slower update cycle when bugs need fixing across all field tablets
- Higher build and maintenance cost

**Why Not Recommended:** Operational complexity of distributing and updating native apps across multiple remote construction sites outweighs native hardware benefits, which are achievable via PWA for this use case.

---

### Approach C: Buy an Existing Brazilian SaaS Platform (Ahgora, PontoTel, Tangerino)

**Description:** Use a ready-made CLT-compliant HR/attendance SaaS platform already built for the Brazilian market.

**Pros:**
- CLT compliance and Point Mirror reports already built
- Faster initial deployment

**Cons:**
- Not designed for multi-site construction field environments
- Cannot integrate natively with Modules 2 and 3 — breaks the unified ecosystem requirement (D2 from kickoff)
- Vendor lock-in; limited customization for geotechnical field workflows

**Why Not Recommended:** Directly violates D2 (unified digital ecosystem). Progress billing and SPT reporting require shared data context across modules that a third-party SaaS cannot provide.

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A — PWA + Cloud Backend |
| **User Confirmation** | 2026-04-20 |
| **Reasoning** | Offline-first requirement + multi-site field deployment + unified platform goal makes PWA the right balance of capability, operational simplicity, and build cost |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Multi-site architecture: each tablet is an independent PoP syncing to central cloud | Prossolo operates multiple simultaneous construction sites | Single-site assumption from kickoff |
| 2 | Offline-first with local IndexedDB queue + background sync | Field connectivity in Northern Brazil is unreliable | Online-only strict mode |
| 3 | Scheduled automatic payroll export via email | Removes manual download step; cleaner operational workflow | Manual export (download + upload by admin) |
| 4 | PWA over native app | No app store friction; instant OTA updates across all field tablets | Native React Native / Flutter app |
| 5 | GPS coordinate capture only (no geofence enforcement) for MVP | Radius calibration per site adds complexity; coordinates alone prove presence | GPS geofencing with boundary enforcement |
| 6 | Selfie photo capture only (no AI biometric matching) for MVP | Biometric matching requires paid API or trained model; photo achieves compliance intent | Automated liveness/face match |
| 7 | Admin direct edit + audit log for exceptions (MVP) | Approval routing UI adds significant scope; audit log achieves same accountability | Formal multi-step approval workflow UI |
| 8 | PIN generation in-app + email/copy (no WhatsApp API) for MVP | WhatsApp Business API has approval delays and per-message cost; not on critical path | WhatsApp Business API integration |
| 9 | Overtime flagging only (no full Bank of Hours) for MVP | CLT Bank of Hours has legal nuance requiring HR/legal input and formal agreements | Full CLT Bank of Hours calculation engine |

---

## Features Removed (YAGNI)

| Feature Suggested | Reason Removed | Can Add Later? |
|-------------------|----------------|----------------|
| GPS Geofencing radius enforcement | Requires site-by-site radius calibration; coordinates alone prove presence for MVP | Yes — v2 |
| WhatsApp Business API PIN delivery | API approval delays + cost; in-app PIN + email achieves onboarding goal | Yes — v2 |
| Bank of Hours (Banco de Horas) full CLT engine | Complex legal rules requiring HR/legal sign-off; overtime flagging is sufficient for MVP | Yes — v2 (requires CLT specialist input) |
| Biometric liveness / AI face matching | Requires paid third-party API or trained model; stored selfie photo achieves compliance intent | Yes — v2 |
| Formal exception approval workflow UI | Multi-step routing UI adds significant build scope; admin direct edit + audit log achieves accountability | Yes — v2 |

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| YAGNI pass — 5 features deferred | ✅ 2026-04-20 | All 5 deferrals accepted | No |
| MVP architecture diagram + data flow | ✅ 2026-04-20 | Architecture confirmed correct | No |

---

## Suggested Requirements for /define

### Problem Statement (Draft)
Replace Prossolo's paper-based multi-site attendance process with a cloud-connected PWA that captures check-ins (QR + PIN + selfie + GPS) on commodity tablets at each construction site, queues records offline, syncs to a central backend, and delivers automated payroll exports on schedule.

### Target Users (Draft)

| User | Pain Point |
|------|------------|
| Field Employees | Must check in at entrance; no phone, no card — just QR + PIN |
| Site Supervisors / Admins | Managing paper logs across sites is error-prone and slow |
| HR / Payroll Staff | Manual transcription of paper records to payroll system is time-consuming and error-prone |
| Management | No visibility into real-time attendance across multiple active sites |
| New Employees | PIN onboarding must be instant and not require IT setup |

### Success Criteria (Draft)

- [ ] Employee can complete check-in on site tablet in under 15 seconds
- [ ] Check-in succeeds and queues locally when tablet has no internet connection
- [ ] All queued records sync to cloud within 5 minutes of connectivity being restored
- [ ] Admin can generate a Point Mirror report for any employee/site/period in under 1 minute
- [ ] Payroll .TXT/.CSV file is automatically emailed to HR on configured schedule
- [ ] Zero attendance records lost due to document misplacement (baseline: paper logs)
- [ ] New employee can be onboarded (QR + PIN generated) in under 2 minutes by admin

### Constraints Identified

- Hardware: Low-cost commodity Android or iOS tablet per site (no dedicated biometric terminals)
- Compliance: Biometric selfie data must comply with LGPD (data retention, access, deletion policy)
- Labor Law: Overtime and shift calculations must comply with Brazilian CLT
- Export format: Payroll export must match the target payroll software's expected .TXT/.CSV schema (to be defined with HR in Define phase)
- Platform: Must share authentication and cloud backend with Modules 2 and 3
- Connectivity: Offline-first is mandatory; no check-in data may be lost due to connectivity gaps

### Out of Scope (Confirmed MVP)

- GPS Geofencing radius enforcement (coordinates captured, boundaries enforced in v2)
- WhatsApp Business API PIN delivery (in-app + email for MVP; WhatsApp in v2)
- Bank of Hours (Banco de Horas) full CLT calculation engine (overtime flagging only in MVP)
- Biometric liveness detection or automated face matching (selfie capture only)
- Formal multi-step exception approval workflow UI (admin direct edit + audit log)
- Integration with Modules 2 and 3 data (shared platform; cross-module features are separate scope)

### Open Items for Define Phase

| # | Item | Owner |
|---|------|-------|
| OI-1 | Identify payroll software name and capture exact .TXT/.CSV field schema | HR / Finance |
| OI-2 | Define LGPD data retention, access, and deletion policy for selfie photos | Legal |
| OI-3 | Define GPS coordinate storage format and precision requirements | Tech Lead |
| OI-4 | Confirm number of active sites and tablet hardware procurement plan | Operations |
| OI-5 | Define Point Mirror report layout (CLT-mandated format or company standard) | HR / Legal |
| OI-6 | Define overtime threshold rules (daily/weekly hours per CLT for relevant employee categories) | HR / Legal |
| OI-7 | Define payroll export schedule (day of week, time, recipient email) | HR |
| OI-8 | Define QR Code format and rotation policy (permanent vs. periodically rotated) | Tech Lead |

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 4 |
| Approaches Explored | 3 |
| Features Removed (YAGNI) | 5 |
| Validations Completed | 2 |
| Selected Approach | Approach A — PWA + Cloud Backend |

---

## Next Step

**Ready for:** `/define .claude/sdd/features/BRAINSTORM_ATTENDANCE_SYSTEM.md`
