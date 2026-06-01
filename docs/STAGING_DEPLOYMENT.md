# Staging Deployment

This repository deploys the `staging` branch with GitHub Actions on a self-hosted runner. The runner builds and starts the root `docker-compose.yml` stack directly on the staging server.

## What The Workflow Does

The workflow is in `.github/workflows/deploy-staging.yml`.

On every push to `staging`, or when manually triggered from GitHub Actions, it:

1. Checks out the `staging` branch on the self-hosted runner.
2. Creates a `.env` file from GitHub repository secrets.
3. Validates the Docker Compose configuration.
4. Runs `docker compose up -d --build --remove-orphans`.
5. Prints the running compose services.

The app container runs `docker-entrypoint.sh`, which applies Prisma DB changes and seeds only on first run.

## Required GitHub Secrets

Set these in GitHub:

`Repository` -> `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

| Secret | Required | Example | Notes |
| --- | --- | --- | --- |
| `DB_PASSWORD` | Yes | `use-a-long-random-password` | PostgreSQL password used by the `db`, `app`, and `backup` services. |
| `NEXTAUTH_SECRET` | Yes | generated value | Generate with `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | Yes | `http://SERVER_IP:3000` or `https://staging.example.com` | Must be the URL users will use to access staging. |
| `OWNER_EMAIL` | Yes | `owner@example.com` | First owner account created by the seed script. |
| `OWNER_PASSWORD` | Yes | `use-a-strong-password` | First owner account password. |
| `APP_BIND_IP` | Yes for Tailscale-only staging | `100.66.117.80` | Host IP Docker binds port `3000` to. Use the server's Tailscale IP to prevent public-IP access. |
| `SYSTEM_MODE` | Recommended | `live` | Use `live` for normal staging. |
| `SNAPSHOT_TIMESTAMP` | Optional | empty | Only set this for snapshot mode. Leave empty for normal staging. |
| `BACKUP_RETENTION_DAYS` | Recommended | `7` | Daily backup retention. |
| `BACKUP_RETENTION_WEEKS` | Recommended | `4` | Weekly backup retention. |

Do not commit a real `.env` file to the repository.

## Server Setup

Run these steps on the staging server.

### 1. Install Docker

Install Docker Engine and the Docker Compose plugin for your Linux distribution.

For Ubuntu, the usual end state should be:

```bash
docker --version
docker compose version
```

Both commands must work before configuring the runner.

### 2. Create A Runner User

```bash
sudo adduser github-runner
sudo usermod -aG docker github-runner
```

Log out and back in, or restart the session, so Docker group membership is applied.

Verify:

```bash
su - github-runner
docker ps
```

### 3. Add The Self-Hosted Runner In GitHub

In GitHub:

`Repository` -> `Settings` -> `Actions` -> `Runners` -> `New self-hosted runner`

Choose Linux, then follow GitHub's commands on the staging server as the `github-runner` user.

When GitHub asks for runner labels, add:

```text
staging
```

The workflow uses:

```yaml
runs-on:
  - self-hosted
  - staging
```

So the runner must have the `staging` label.

### 4. Install The Runner As A Service

From the runner directory on the server:

```bash
sudo ./svc.sh install github-runner
sudo ./svc.sh start
sudo ./svc.sh status
```

The runner should show as `Idle` in GitHub before deployment.

### 5. Restrict Access To Tailscale

The app port is bound with `APP_BIND_IP`:

```yaml
ports:
  - "${APP_BIND_IP:-127.0.0.1}:3000:3000"
```

For Tailscale-only staging, set this GitHub secret:

```text
APP_BIND_IP=100.66.117.80
```

Set `NEXTAUTH_URL` to the MagicDNS URL or Tailscale IP URL users open:

```text
NEXTAUTH_URL=http://rgunaya001.tail7c6164.ts.net:3000
```

or:

```text
NEXTAUTH_URL=http://100.66.117.80:3000
```

Allow port `3000` only on the Tailscale interface:

```bash
sudo ufw allow in on tailscale0 to any port 3000 proto tcp
```

Do not add a public UFW rule like this unless public access is intentional:

```text
sudo ufw allow 3000/tcp
```

Docker can bypass normal-looking UFW output when a port is published on `0.0.0.0`. Binding Docker directly to the Tailscale IP is the important fix.

After deployment, verify Docker is not listening on every interface:

```bash
sudo docker ps
```

The app port should look like:

```text
100.66.117.80:3000->3000/tcp
```

It should not look like:

```text
0.0.0.0:3000->3000/tcp
```

## First Deployment

Push to the `staging` branch:

```bash
git push origin staging
```

Or run manually:

`GitHub` -> `Actions` -> `Deploy staging` -> `Run workflow`

Then check on the server:

```bash
docker compose ps
docker compose logs -f app
```

## Updating Staging

Every later push to `staging` automatically rebuilds and restarts the containers.

The PostgreSQL data, app data, and backups are stored in Docker volumes:

```text
pgdata
appdata
backups
```

They are not removed by the workflow.

## Useful Server Commands

From the runner workspace after at least one deployment:

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f db
docker compose restart app
docker compose down
docker compose up -d --build
```

Use `docker compose down -v` only if you intentionally want to delete database/app/backup volumes.
