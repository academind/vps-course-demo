# Deployment

## Requirements

- Ubuntu VPS
- A domain or subdomain pointing to the VPS IP
- Ports `80` and `443` reachable from the public internet
- Docker Engine + Docker Compose plugin installed
  - Docker install docs: https://docs.docker.com/engine/install/ubuntu/

## Deployment files

- `compose.yml`
- `Dockerfile`
- `.env`

## What gets deployed

- `traefik`
  - reverse proxy
  - HTTP → HTTPS redirect
  - Let's Encrypt certificate management
  - only public entrypoint; publishes host ports `80` and `443`
- `app`
  - TanStack Start app on port `3000`
  - not published on the host; only reachable internally via Traefik
  - SQLite database at `/app/data/ideas.db`

## Environment variables

Create `.env` from the example file:

```bash
cp .env.example .env
```

Set real values:

```dotenv
APP_DOMAIN=ideas.example.com
ACME_EMAIL=you@example.com
```

Both values are required. `docker compose` will fail fast if they are missing or empty.

## Get the project onto the VPS

Choose one approach.

### 1) `scp`
From the folder that contains `vps-demo-app`:

```bash
scp -r vps-demo-app <USER>@<VPS_IP>:~/
ssh <USER>@<VPS_IP>
cd ~/vps-demo-app
```

`scp` can copy folders recursively with `-r`, but it has no native exclude flag. If you want to skip `node_modules`, `.git`, `.env`, or `data`, use `rsync` instead.

### 2) `rsync`
From your local machine:

```bash
rsync -av --exclude node_modules --exclude .git --exclude .env --exclude data ./ <USER>@<VPS_IP>:~/vps-demo-app/
ssh <USER>@<VPS_IP>
cd ~/vps-demo-app
```

Windows: run the same `rsync` command inside WSL.

### 3) `git`
On the VPS:

```bash
git clone <YOUR_REPO_URL> ~/vps-demo-app
cd ~/vps-demo-app
```

## Deploy on the VPS

```bash
cd ~/vps-demo-app
cp .env.example .env
# edit .env
docker compose up -d --build
```

## Verify

```bash
docker compose ps
docker compose logs -f traefik
docker compose logs -f app
```

Open:

```txt
https://YOUR_DOMAIN
```

## Update

- `git`: run `git pull`
- `rsync`: run the same `rsync` command again
- `scp`: best for the first upload; for updates, `rsync` or `git` is usually easier

Then rebuild:

```bash
docker compose up -d --build app
```

If you changed Traefik config too:

```bash
docker compose up -d --build
```

## Stop / remove

Stop containers only:

```bash
docker compose stop
```

Stop and remove containers and network:

```bash
docker compose down
```

Stop and remove containers, network, and volumes:

```bash
docker compose down -v
```

`docker compose down -v` deletes:

- SQLite data
- Let's Encrypt ACME data

## Persistence

Named Docker volumes are used for persistent data:

- `app_data` → `/app/data`
- `traefik_letsencrypt` → `/letsencrypt`

`docker compose down` keeps those volumes.

## Logging

- The app logs to stdout/stderr
- Docker stores logs with the `local` logging driver
- Log rotation is enabled in `compose.yml`
- View logs with:

```bash
docker compose logs -f app
docker compose logs -f traefik
```

## Notes

- DNS must already point `APP_DOMAIN` to the VPS before Let's Encrypt can succeed
- Port `80` must be reachable because Traefik uses the HTTP-01 challenge
- `compose.yml` publishes `80` and `443` via Docker (`traefik` only). Docker-published ports bypass normal `ufw` filtering, so do not rely on `ufw` to restrict vps ports
- In this project that is acceptable because only `traefik` publishes `80` and `443`; the `app` service does **not** publish `3000`
- If your VPS provider has a network firewall / security group, allow inbound `80` and `443` there too
- Avoid repeated failed Let's Encrypt attempts while troubleshooting; production has rate limits. If you need lots of retries, test with Let's Encrypt staging first and then switch back to production
- Both services use `restart: unless-stopped`
