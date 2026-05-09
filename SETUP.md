# CHPMS — Setup Guide

## Prerequisites

| Tool | Minimum Version | Check Command |
|------|----------------|---------------|
| Docker Desktop | **4.30+** | `docker --version` |
| Docker Compose | **2.24+** (bundled with Docker Desktop) | `docker compose version` |
| Node.js | **20.x** | `node --version` |
| npm | **10+** | `npm --version` |
| Git | **2.39+** | `git --version` |

> **Important:** All team members should use the **same Docker Desktop version** to avoid API compatibility issues.

---

## Quick Start (Docker — Production-style)

```bash
# 1. Clone the repo
git clone https://github.com/CODEight-8/chpms.git
cd chpms

# 2. Create .env from example
cp .env.example .env
# Edit .env with your values (DB_PASSWORD, NEXTAUTH_SECRET, OWNER_EMAIL, OWNER_PASSWORD)

# 3. Build and run
docker compose up -d --build

# 4. Verify
curl http://localhost:3000/api/health
```

---

## Quick Start (Local Dev — without Docker for app)

```bash
# 1. Clone and switch branch
git clone https://github.com/CODEight-8/chpms.git
cd chpms
git checkout dev/local-setup

# 2. One-time setup (starts DB in Docker, installs deps, seeds data)
npm run dev:setup

# 3. Start dev server
npm run dev
```

App runs at **http://localhost:3000**

### Dev Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@chpms.dev | owner123 |
| Manager | manager@chpms.dev | manager123 |
| Production | production@chpms.dev | production123 |

### Dev Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run dev:setup` | First-time setup (DB + deps + seed) |
| `npm run dev:sync` | Reset DB to team snapshot |
| `npm run dev:snapshot` | Export current DB as snapshot |
| `npm run dev:db:up` | Start dev database only |
| `npm run dev:db:down` | Stop dev database |
| `npm run dev:db:reset` | Wipe DB and re-setup |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |

---

## Platform-Specific Notes

### Windows

- **Git line endings:** Ensure `core.autocrlf` is set to `false` or `input`:
  ```powershell
  git config --global core.autocrlf input
  ```
  The `.gitattributes` file handles this per-file, but setting this globally avoids surprises.

- **Shell scripts:** Dev scripts (`npm run dev:setup`, etc.) require **Git Bash** or **WSL**. They will not run in PowerShell or CMD directly.

- **Docker Desktop API error** (`Internal Server Error for API route`):
  1. Update Docker Desktop to the latest version
  2. If you can't update, add this to your `.env`:
     ```
     DOCKER_API_VERSION=1.43
     ```
  3. Restart Docker Desktop and retry

### macOS

- No special configuration needed.
- If port 5432 is occupied by a local PostgreSQL, the dev setup uses port 5434 automatically.

### Linux

- Ensure your user is in the `docker` group:
  ```bash
  sudo usermod -aG docker $USER
  ```
- Log out and back in for group changes to take effect.

---

## Deployment (Facility PC)

```bash
# Set environment variables
cp .env.example .env
# Edit .env — set strong DB_PASSWORD, NEXTAUTH_SECRET, and OWNER credentials

# For Tailscale VPN access, set:
# NEXTAUTH_URL=http://100.x.x.x:3000

# Build and start
docker compose up -d --build

# Verify
curl http://localhost:3000/api/health
# Expected: {"status":"ok","db":"connected","mode":"live"}
```

### Health Check

- **Endpoint:** `GET /api/health`
- **Unauthenticated** — can be used by monitoring tools
- Returns: status, db connection, mode (live/snapshot), last backup time

### Backup

- Automated daily backups run at 2:00 AM via the `backup` Docker service
- Backups are stored in the `backups` Docker volume
- To restore: `docker compose exec backup sh /tmp/backup.sh`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Google Fonts fetch failed` during build | Already fixed — app uses local font files |
| `docker-entrypoint.sh: not found` | Already fixed — CRLF stripping in Dockerfile |
| `DB_PASSWORD must be set` | Create `.env` from `.env.example` |
| Port 3000 in use | `lsof -ti :3000 \| xargs kill -9` (Mac/Linux) or find/kill in Task Manager (Windows) |
| Docker API version mismatch | Add `DOCKER_API_VERSION=1.43` to `.env` |
| `prisma db push` fails | Ensure the database container is running and `DATABASE_URL` is correct |
