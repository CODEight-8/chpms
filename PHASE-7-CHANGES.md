# Phase 7 — Deployment & Infrastructure Changes

**Status:** Planning
**Branch:** `wanigarathnekaa/phase-7-deployment`
**Date:** 5 April 2026

---

## Overview

Phase 7 hardens the system for production deployment at the client facility. These changes prepare CHPMS for real-world use where the facility PC in Sri Lanka runs the live system and the owner monitors remotely from Hong Kong via Tailscale VPN.

---

## Change 1: Health Check Endpoint

**Problem:** No way to verify the system is alive after a power outage or crash. Docker only checks if the port is open, not if the app + DB are actually working.

**What changes:**
- New file: `src/app/api/health/route.ts`
- New table: `system_status` in Prisma schema (key-value store for `last_backup_at`, `system_mode`)

**API:** `GET /api/health` (unauthenticated)
```json
{
  "status": "ok",
  "mode": "live",
  "db": "connected",
  "uptime": 3600,
  "lastBackupAt": "2026-04-05T12:00:00Z",
  "version": "1.0.0"
}
```

**Risk:** None — additive only, no existing code touched.

**Files:**
| File | Action | Impact |
|------|--------|--------|
| `prisma/schema.prisma` | ADD `SystemStatus` model | DB migration needed (additive) |
| `src/app/api/health/route.ts` | NEW | No auth required for basic health |
| `src/app/api/system/status/route.ts` | NEW | OWNER-only, returns full status with mode/backup info |
| `docker-compose.yml` | MODIFY healthcheck | Change from port check to `curl /api/health` |

---

## Change 2: System Mode & Sync Status (Live / Snapshot)

**Problem:** Owner in Hong Kong needs to know at a glance whether they're looking at real-time data or a stale backup copy.

**What changes:**
- Environment variable `SYSTEM_MODE` (default: `live`)
- Sidebar footer shows mode indicator with color-coded dot
- `/api/system/status` returns mode + last backup timestamp

**Display rules:**
| Condition | Indicator |
|-----------|-----------|
| Live + backup within 24h | `Green dot` · Live · Synced 2h ago |
| Live + backup overdue >24h | `Red dot` · Live · Backup overdue |
| Snapshot mode | `Amber dot` · Snapshot · Data from Mar 31, 6:00 PM |
| DB unreachable | `Red dot` · Offline |

**Risk:** Low — sidebar change is additive. Mode is read from env var, no logic changes to existing features.

**Files:**
| File | Action | Impact |
|------|--------|--------|
| `src/components/layout/system-status.tsx` | NEW | Client component, fetches `/api/system/status` |
| `src/components/layout/sidebar.tsx` | MODIFY | Add `<SystemStatus />` above user profile section |
| `docker-compose.yml` | MODIFY | Add `SYSTEM_MODE: ${SYSTEM_MODE:-live}` env var |
| `.env.example` | MODIFY | Add `SYSTEM_MODE` documentation |

**Dependencies:** Requires Change 1 (health endpoint + SystemStatus table).

---

## Change 3: Configurable NEXTAUTH_URL for Tailscale

**Problem:** `NEXTAUTH_URL` is hardcoded to `http://localhost:3000` in docker-compose.yml. When owner accesses via Tailscale IP (e.g. `http://100.x.x.x:3000`), auth callbacks break because NextAuth redirects to localhost.

**What changes:**
- Move `NEXTAUTH_URL` from hardcoded to `.env` variable
- Document Tailscale setup in `.env.example`

**Risk:** None — config-only change, no code changes.

**Files:**
| File | Action | Impact |
|------|--------|--------|
| `docker-compose.yml` | MODIFY | Change `NEXTAUTH_URL: http://localhost:3000` → `NEXTAUTH_URL: ${NEXTAUTH_URL:-http://localhost:3000}` |
| `.env.example` | MODIFY | Add Tailscale URL instructions |

---

## Change 4: Mobile Responsive Sidebar

**Problem:** Sidebar is fixed 64px wide on all screen sizes. On mobile/tablets it covers the screen or pushes content off-viewport. Facility staff may use tablets.

**What changes:**
- Sidebar hidden on mobile by default, shown via hamburger toggle
- Main content uses full width on mobile, `md:ml-64` on desktop
- Add mobile header bar with hamburger + brand

**Risk:** Medium — touches layout.tsx and sidebar.tsx which wrap every page. Must test all pages after change.

**Mitigation:** Only CSS/responsive class changes + a state toggle. No data flow, API, or business logic changes.

**Files:**
| File | Action | Impact |
|------|--------|--------|
| `src/components/layout/sidebar.tsx` | MODIFY | Add mobile toggle state, `hidden md:flex` classes, hamburger button, overlay backdrop |
| `src/app/(authenticated)/layout.tsx` | MODIFY | Change `ml-64` → `md:ml-64`, add mobile header bar |

**Test checklist:**
- [ ] Desktop (>768px): sidebar visible, no hamburger, content offset
- [ ] Mobile (<768px): sidebar hidden, hamburger visible, sidebar slides in on tap
- [ ] All pages render correctly at both breakpoints
- [ ] Sidebar closes when navigating to a new page (mobile)
- [ ] Sidebar closes when tapping outside (mobile)

---

## Change 5: PM2 Process Management

**Problem:** `node server.js` runs as PID 1 in Docker. If Node crashes (unhandled exception, OOM), the container exits and Docker restarts it — but that's a full cold restart (migrations, seed check, etc.). PM2 restarts the process instantly without container restart.

**What changes:**
- Add `pm2` as production dependency
- Create `ecosystem.config.js` for PM2 configuration
- Entrypoint uses `pm2-runtime` instead of `node server.js`

**Risk:** Low — only changes the process runner, not the app. PM2 is battle-tested.

**Files:**
| File | Action | Impact |
|------|--------|--------|
| `package.json` | MODIFY | Add `pm2` dependency |
| `ecosystem.config.js` | NEW | PM2 config (instances: 1, max_memory: 512M, log rotation) |
| `docker-entrypoint.sh` | MODIFY | Replace `node server.js` → `npx pm2-runtime start ecosystem.config.js` |
| `Dockerfile` | No change | pm2 installed via npm ci from package.json |

---

## Change 6: Automated Database Backup & Owner Sync

**Problem:** No automated backups. If the facility PC's hard drive fails, all data is lost. Owner in Hong Kong has no way to get a copy of the data.

**What changes:**
- Backup script that runs `pg_dump` daily
- Backup rotation (7 daily + 4 weekly)
- Docker backup service with cron schedule
- OWNER-only API to trigger manual backup + download
- Restore script for disaster recovery
- After each backup, `last_backup_at` timestamp written to `system_status` table

**Risk:** Medium — adds a new Docker service and DB writes. But backup service is isolated (separate container), and the status write is a single row upsert.

**Files:**
| File | Action | Impact |
|------|--------|--------|
| `backup/backup.sh` | NEW | pg_dump with rotation, updates system_status |
| `backup/restore.sh` | NEW | pg_restore helper script |
| `backup/Dockerfile` | NEW | Alpine + postgresql-client + cron |
| `docker-compose.yml` | MODIFY | Add backup service, add backups volume |
| `src/app/api/system/backup/route.ts` | NEW | OWNER-only manual backup trigger + download |
| `.env.example` | MODIFY | Add `BACKUP_RETENTION_DAYS` documentation |

---

## Implementation Order & Safety Strategy

### Order of implementation (safest first):

```
Step 1: Health check endpoint + SystemStatus table
         └── Additive only. No existing files modified except schema.
             Test: curl /api/health returns 200

Step 2: NEXTAUTH_URL config
         └── Config change only. Zero code changes.
             Test: Access via Tailscale IP, login works

Step 3: System mode indicator (sidebar)
         └── Depends on Step 1. Only sidebar UI addition.
             Test: Sidebar shows "Live" with green dot

Step 4: PM2 process management
         └── Changes entrypoint only. App code untouched.
             Test: Kill node process inside container, PM2 restarts it

Step 5: Mobile responsive sidebar
         └── CSS/layout changes. Test all pages at both breakpoints.
             Test: Mobile hamburger works, desktop unchanged

Step 6: Automated backups + owner sync
         └── New Docker service. Isolated from app.
             Test: Backup file created, restore works, status shows timestamp
```

### Rollback plan

Each step is independently deployable and reversible:
- Steps 1-3: Delete new files, revert schema, `prisma db push`
- Step 4: Revert entrypoint to `node server.js`
- Step 5: Revert sidebar.tsx and layout.tsx CSS classes
- Step 6: Remove backup service from docker-compose

### What NOT to change

These files contain critical business logic and must NOT be modified in Phase 7:
- `src/lib/auth.ts` — authentication logic
- `src/lib/permissions.ts` — role-based access control
- `src/lib/validators.ts` — input validation schemas
- `src/lib/audit-log.ts` — audit trail
- `src/lib/status-machines.ts` — status transitions
- All API routes under `src/app/api/` (except adding new `/api/health` and `/api/system/*`)
- All query files under `src/lib/queries/`

### Database migration safety

Only ONE schema addition: `SystemStatus` table (key-value, 2 columns). This is:
- Non-breaking (additive)
- No relation to existing tables
- Applied via `prisma db push` (same as all prior migrations)
- No data migration needed

---

## Environment Variables Summary (New)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `SYSTEM_MODE` | `live` | No | Set to `snapshot` when running from a restored backup |
| `SNAPSHOT_TIMESTAMP` | _(empty)_ | No | ISO timestamp of the backup being used (snapshot mode only) |
| `NEXTAUTH_URL` | `http://localhost:3000` | Yes | Full URL including Tailscale IP for remote access |
| `BACKUP_RETENTION_DAYS` | `7` | No | Number of daily backups to keep |
| `BACKUP_RETENTION_WEEKS` | `4` | No | Number of weekly backups to keep |

---

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Docker image size | ~350MB | ~355MB (+pm2) |
| Startup time | ~5s | ~6s (pm2 overhead) |
| New API endpoints | 0 | 3 (`/health`, `/system/status`, `/system/backup`) |
| New Docker services | 2 (app, db) | 3 (app, db, backup) |
| New DB tables | 0 | 1 (`system_status`) |
| Existing files modified | 0 | 5 (schema, docker-compose, entrypoint, sidebar, layout) |
| New files | 0 | 8 |

---

*Document created 5 April 2026 — CODEight PVT (LTD)*
