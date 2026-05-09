# CHPMS - Coconut Husk Processing Management System

A full-stack inventory, production, and accounting management system for coconut husk chip processing facilities. Built with Next.js 14, Prisma, PostgreSQL, and Docker.

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.30+ (includes Compose v2)
- [Git](https://git-scm.com/) 2.39+
- [Node.js](https://nodejs.org/) 20.x (for local dev only)

### Run with Docker (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/CODEight-8/chpms.git
cd chpms

# 2. Create your environment file
cp .env.example .env

# 3. Edit .env with your values:
#    - DB_PASSWORD: use a strong password
#    - NEXTAUTH_SECRET: run `openssl rand -base64 32` to generate
#    - OWNER_EMAIL / OWNER_PASSWORD: your admin login credentials

# 4. Build and start
docker compose up -d --build

# 5. Open http://localhost:3000 and log in
```

First startup takes ~2-3 minutes (building image, running migrations, seeding database).

### Verify

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","db":"connected","mode":"live"}
```

### Stop

```bash
docker compose down        # stop containers (data persists)
docker compose down -v     # stop and delete all data
```

## Platform Notes

| Platform | Notes |
|----------|-------|
| **macOS** | No special configuration needed |
| **Linux** | Add your user to the docker group: `sudo usermod -aG docker $USER` then re-login |
| **Windows** | Use WSL2 or Git Bash. Set `git config --global core.autocrlf input` |

## Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup, configuration, and troubleshooting guide
- **[CHPMS-SYSTEM-DOCUMENTATION.md](./CHPMS-SYSTEM-DOCUMENTATION.md)** - System architecture and design

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Prisma ORM, PostgreSQL 16
- **Auth:** NextAuth.js with credential provider, role-based access (Owner/Manager/Production)
- **Infra:** Docker Compose, PM2 process manager, automated daily backups
