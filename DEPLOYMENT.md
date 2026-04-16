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
- `traefik/traefik.yml`
- `.env`

## What gets deployed

- `traefik`
  - reverse proxy
  - HTTP → HTTPS redirect
  - Let's Encrypt certificate management
- `app`
  - TanStack Start app on port `3000`
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

## Deploy

```bash
git clone <YOUR_REPO_URL> vps-demo-app
cd vps-demo-app
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

```bash
git pull
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
- If you use `ufw`, allow inbound `80` and `443`
- Avoid repeated failed Let's Encrypt attempts while troubleshooting; production has rate limits. If you need lots of retries, test with Let's Encrypt staging first and then switch back to production
- Both services use `restart: unless-stopped`
