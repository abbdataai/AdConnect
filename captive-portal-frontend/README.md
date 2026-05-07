# Captive Portal Frontend

React 18 + Vite + TypeScript SPA implementing the 5-screen captive-portal flow
(connecting → form → ad → connected → renew) per
[DESIGN_CAPTIVE_PORTAL.md](../.claude/sdd/features/DESIGN_CAPTIVE_PORTAL.md).

## Quickstart

```bash
npm install
npm run dev          # vite on :5173 (proxies /api → :8000)
```

Open <http://localhost:5173/?venue_id=22222222-2222-2222-2222-222222222222&device_id=11111111-1111-1111-1111-111111111111&mac_hash=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa>

The backend (`backend/main.py`) must be running with one worker:

```bash
cd ../backend && uvicorn main:app --port 8000 --workers 1
```

## Scripts

| Script           | Description                                      |
|------------------|--------------------------------------------------|
| `npm run dev`    | Vite dev server (HMR, /api proxy)               |
| `npm run build`  | `tsc --noEmit && vite build` → `dist/`           |
| `npm run preview`| Preview the production build                     |
| `npm run typecheck` | Strict TS check                              |
| `npm run test`   | Vitest unit tests                                |
| `npm run test:e2e` | Playwright e2e tests (iPhone 14 Pro viewport)|

## AT-to-test mapping

| AT      | Test                                               |
|---------|----------------------------------------------------|
| AT-001  | `tests/e2e/happyPath.spec.ts`                      |
| AT-010  | `tests/e2e/happyPath.spec.ts` (auto-advance assert)|
| AT-011  | `tests/e2e/happyPath.spec.ts` (non-skippable copy) |
| AT-012  | `tests/unit/format.test.ts` + `happyPath.spec.ts`  |
| AT-017  | `npm run typecheck` (CI)                           |
| AT-018  | `tests/fixtures/expected_strings_pt-BR.txt` snapshot|

Other ATs (AT-002, AT-004, AT-013, AT-014, AT-016) are scaffolded as separate
e2e specs in the design but were not created in this build cycle — see the
build report for follow-up tasks.

## Architecture

- **State**: single `useReducer` in [src/App.tsx](src/App.tsx) over the machine in
  [src/state/machine.ts](src/state/machine.ts) (5 actions, exhaustive switch,
  `assertNever` guard).
- **Strings**: all pt-BR copy frozen in [src/strings.ts](src/strings.ts);
  components import from `STR.*`, never inline literals.
- **Types**: hand-written TS in [src/state/types.ts](src/state/types.ts) mirror
  the Pydantic schemas in `backend/schemas/portal.py`. Drift is caught by
  `backend/tests/test_openapi_contract.py`.
- **Lazy chunks**: `AdScreen` is a Vite `manualChunks` split — saves ~5 KB
  gzipped during the time-critical connecting → form phase.
- **Theming**: CSS variables (`--accent`, `--accent-2`) injected from
  `BootstrapResponse.venue.branding` for future per-tenant branding.
