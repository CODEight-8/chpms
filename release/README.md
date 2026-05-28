# CHPMS — Coconut Husk Processing Management System

**Version 1.0** · Client install package

This folder contains everything needed to install and run CHPMS on a single
computer. The system is designed for on-premises use — your data stays on
your own machine, never sent to any external server.

---

## Quick start

### 1. Install Docker Desktop (one-time)

- **macOS**: https://www.docker.com/products/docker-desktop/
- **Windows**: https://www.docker.com/products/docker-desktop/
- **Linux**: https://docs.docker.com/engine/install/

After installing, open Docker Desktop and wait for the whale icon to stop animating.

### 2. Run the setup wizard

**macOS / Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:** double-click `setup.bat`.

The wizard will:
1. Check Docker is installed and running
2. Ask for your owner email and password (the first admin login)
3. Generate strong random passwords for the database
4. Load the application image (one-time, ~1–2 minutes)
5. Download PostgreSQL (one-time, needs internet)
6. Start everything
7. Open the application in your browser

### 3. Log in

Open **http://localhost:3000** in your browser. Log in with the email and
password you set during setup.

---

## Daily use

Docker Desktop launches at startup; CHPMS launches automatically with it.

### Start / stop manually

```bash
docker compose start    # start everything
docker compose stop     # stop (data preserved)
docker compose restart  # restart everything
```

### View live logs

```bash
docker compose logs -f app
```
Press **Ctrl-C** to exit.

---

## Access from other computers (Tailscale)

1. Install Tailscale on the **host machine**: https://tailscale.com/download
2. Sign in and note the machine's Tailscale name (e.g. `chpms-host`).
3. Install Tailscale on each **client machine**, sign in with the same account.
4. On each client computer, open `http://chpms-host:3000`.

If you set Tailscale up after install, edit `.env`:
```
NEXTAUTH_URL=http://chpms-host:3000
```
Then `docker compose restart app`.

---

## Backups

CHPMS automatically backs up the database **every night at 2:00 AM** into a
Docker volume named `backups`. Backups are kept for 7 daily snapshots plus
4 weekly snapshots.

### Copy backups out of Docker (recommended weekly)

```bash
docker run --rm -v chpms_backups:/backups -v "$(pwd)":/out alpine \
  cp -r /backups /out/
```

Store the copied `backups/` folder somewhere safe (external drive, cloud).

---

## Updating to a new version

1. Stop: `docker compose stop`
2. Replace `chpms-X.Y.Z.tar.gz` and `docker-compose.yml` from the new delivery
3. Run setup: `./setup.sh` (wizard skips when `.env` already exists)
4. Start: `docker compose start`

Your data lives in Docker volumes and is **never overwritten** by updates.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Docker is not running" | Open Docker Desktop, wait for whale icon |
| Browser shows "can't be reached" | `docker compose ps` — all services should be running/healthy |
| Port 3000 already in use | Edit `docker-compose.yml`, change `"3000:3000"` to `"3001:3000"` |
| Forgot owner password | Contact support |

### Full uninstall (deletes ALL data)

```bash
docker compose down -v
docker rmi chpms:1.0.0
```

Make a backup first.

---

## Folder contents

| File | Purpose |
|---|---|
| `docker-compose.yml` | The Docker recipe for CHPMS |
| `.env` | Your private config (created by wizard — **don't share**) |
| `.env.example` | Template for `.env` |
| `setup.sh` / `setup.bat` | Setup wizard |
| `chpms-1.0.0.tar.gz` | The application image (loaded by the wizard) |
| `backup/backup.sh` | Used by the backup container |
| `README.md` | This file |
| `USER-GUIDE.md` | How to use the application day-to-day |

---

## Support

When reporting an issue, include:
1. What you were doing
2. What happened (screenshot if possible)
3. Output of: `docker compose logs app --tail 100 > logs.txt`

**System version:** 1.0.0
**Delivered:** 2026-05-24
