# Deployment Guide

This project is deployed with **Docker Compose** and **Traefik**.

The Docker image for the app uses **Node.js 24**. For local non-Docker development, use Node.js 24 as well.

## Deployment architecture

The production setup consists of two containers:

- **app**: the TanStack Start application running on Node.js
- **traefik**: reverse proxy, HTTPS terminator, and Let's Encrypt client

### Traffic flow

1. The browser connects to Traefik on port `80` or `443`.
2. Traefik redirects HTTP to HTTPS.
3. Traefik obtains and renews TLS certificates from Let's Encrypt.
4. Traefik forwards matching requests to the app container on port `3000`.
5. The app stores submitted ideas in SQLite at `/app/data/ideas.db`.

### Persistence

The stack uses Docker named volumes for persistent data:

- `app_data` → SQLite database storage
- `traefik_letsencrypt` → Let's Encrypt ACME storage

That means:

- app data survives container restarts and image rebuilds
- TLS certificates survive container restarts and image rebuilds

---

## Why this setup matches the official docs

### TanStack Start

The current official TanStack Start hosting docs recommend the Nitro + Node path for Docker/Node deployments:

- build the app
- run `node .output/server/index.mjs`

This project follows that exactly inside the Docker image.

### Docker

The Docker image uses a **multi-stage build**, matching the Docker docs recommendation to separate:

- build dependencies and build tooling
- final runtime image

### Traefik

The Traefik setup follows the official Docker-provider and ACME docs by:

- enabling the Docker provider
- setting `exposedByDefault=false`
- routing via container labels
- using the HTTP-01 ACME challenge on port `80`
- publishing ports `80` and `443`

---

## Files added for deployment

- `Dockerfile`
- `.dockerignore`
- `compose.yml`
- `traefik/traefik.yml`
- `.env.example`

---

## Prerequisites

Before deploying, you need:

1. A VPS running Ubuntu
2. A domain or subdomain pointing to the VPS
3. Ports `80` and `443` reachable from the public internet
4. Docker Engine + Docker Compose plugin installed

### DNS requirement

Create an `A` record (and optionally `AAAA` if using IPv6) for your domain, for example:

- `ideas.example.com` → your VPS public IP

Let's Encrypt will only work once the DNS record points to the server.

---

## Install Docker on Ubuntu

The official Docker docs recommend installing Docker Engine from Docker's apt repository.

### 1. Remove conflicting packages

```bash
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
  sudo apt-get remove -y $pkg
done
```

### 2. Update apt and install prerequisites

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
```

### 3. Add Docker's official GPG key

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

### 4. Add Docker's apt repository

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 5. Install Docker Engine and Compose plugin

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 6. Verify Docker

```bash
sudo docker run hello-world
```

### Optional: run Docker without sudo

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Then verify:

```bash
docker version
docker compose version
```

---

## About Traefik installation

You do **not** install Traefik separately on the host.

This project uses the official Traefik Docker image in `compose.yml`, so Traefik is:

- pulled automatically by Docker
- configured through `traefik/traefik.yml`
- started and managed through `docker compose`

---

## Server preparation

### 1. Clone the repository

```bash
git clone <YOUR_REPO_URL> vps-demo-app
cd vps-demo-app
```

### 2. Create the deployment env file

```bash
cp .env.example .env
```

### 3. Edit `.env`

Set your real values:

```dotenv
APP_DOMAIN=ideas.example.com
ACME_EMAIL=you@example.com
```

### What these values do

- `APP_DOMAIN`
  - the domain Traefik should route to this app
  - used in the Traefik Host rule
- `ACME_EMAIL`
  - email address used for Let's Encrypt registration and expiry notices

---

## Traefik configuration used here

### Static Traefik config

`traefik/traefik.yml` configures:

- `web` entrypoint on port `80`
- `websecure` entrypoint on port `443`
- HTTP → HTTPS redirection
- Docker provider with `exposedByDefault: false`

### Dynamic app routing via Docker labels

The app container exposes labels that tell Traefik:

- enable routing for this container
- match requests for `APP_DOMAIN`
- serve them on the `websecure` entrypoint
- use TLS
- obtain certificates through the `letsencrypt` resolver
- forward traffic to port `3000` inside the app container

### Let's Encrypt / ACME

Traefik is configured to use the **HTTP-01 challenge**.

That means:

- port `80` must be reachable from the public internet
- the domain must already point to the VPS
- Traefik will store ACME state in `/letsencrypt/acme.json`

In this stack, `/letsencrypt` is backed by a Docker named volume.

---

## Deploy the stack

From the project root on the VPS, run:

```bash
docker compose up -d --build
```

What happens:

1. Docker builds the app image using the multi-stage `Dockerfile`
2. Docker starts Traefik
3. Docker starts the app
4. Traefik discovers the app through Docker labels
5. Traefik serves the app for `APP_DOMAIN`
6. Traefik requests a TLS certificate from Let's Encrypt

---

## Verify the deployment

### Check container status

```bash
docker compose ps
```

You should see both services up:

- `traefik`
- `app`

### Check app logs

```bash
docker compose logs -f app
```

### Check Traefik logs

```bash
docker compose logs -f traefik
```

### Visit the app

Open:

```txt
https://YOUR_DOMAIN
```

If DNS is correct and ports 80/443 are reachable, Traefik should provision TLS automatically.

---

## First deployment notes

On the first deployment:

- certificate issuance can take a short moment
- if DNS has not propagated yet, Let's Encrypt will fail
- if port 80 is blocked, the HTTP challenge will fail

### If you recently changed DNS

Wait until the record resolves publicly before retrying.

You can test with:

```bash
dig +short ideas.example.com
```

or:

```bash
nslookup ideas.example.com
```

The domain should resolve to your VPS IP.

---

## Updating the application

When you push new code and want to deploy an update:

```bash
git pull
docker compose up -d --build app
```

If Traefik configuration also changed, rebuild the whole stack:

```bash
docker compose up -d --build
```

---

## Restart behavior

Both services use:

```yaml
restart: unless-stopped
```

That means:

- they restart automatically if Docker restarts after a VPS reboot
- they restart automatically after unexpected crashes
- they stay stopped if you stopped them manually yourself

So for this Docker-based deployment, you do **not** need a separate systemd service for the app.

---

## Useful commands

### Start or recreate the stack

```bash
docker compose up -d --build
```

### Stop the stack

```bash
docker compose down
```

### Stop and remove containers but keep volumes

```bash
docker compose down
```

### Stop and remove containers **and** volumes

**Danger: this deletes SQLite data and ACME state**

```bash
docker compose down -v
```

### Follow all logs

```bash
docker compose logs -f
```

### Rebuild only the app image

```bash
docker compose build app
```

---

## Data persistence details

### SQLite data

The app writes SQLite files to:

```txt
/app/data
```

This is backed by the named Docker volume:

```txt
app_data
```

So database contents survive:

- container restarts
- image rebuilds
- normal `docker compose down`

### Let's Encrypt data

Traefik stores ACME state at:

```txt
/letsencrypt/acme.json
```

This is backed by the named Docker volume:

```txt
traefik_letsencrypt
```

So certificates and renewal metadata survive:

- container restarts
- image rebuilds
- normal `docker compose down`

---

## Troubleshooting

### 1. Browser shows no valid certificate

Check:

- does `APP_DOMAIN` point to the VPS IP?
- are ports `80` and `443` open?
- is Traefik running?
- did Let's Encrypt fail in Traefik logs?

```bash
docker compose logs -f traefik
```

### 2. Let's Encrypt challenge fails

Common causes:

- DNS still points somewhere else
- port `80` blocked by cloud firewall / provider firewall / host firewall
- another process is already using port `80`

### 3. App container fails to start

Check:

```bash
docker compose logs -f app
```

### 4. Port 80 or 443 already in use

Find the conflicting process or service:

```bash
sudo ss -tulpn | grep -E ':80|:443'
```

If Nginx or Apache is already running, stop/disable it or move it out of the way.

### 5. Firewall issues

The Docker docs note that published container ports interact with firewall rules differently than normal host services.

If you use `ufw`, double-check that inbound traffic to ports `80` and `443` is allowed and test from outside the server.

### 6. App data missing after redeploy

If you used:

```bash
docker compose down -v
```

you removed the named volume and therefore deleted the SQLite database.

---

## Security notes

### Docker socket access

Traefik's Docker provider requires access to the Docker API. In this setup, that is provided by mounting:

```txt
/var/run/docker.sock:/var/run/docker.sock:ro
```

This is a common and documented setup, but it is still security-sensitive. Only run trusted containers on the host.

### Traefik dashboard

This setup does **not** expose the Traefik dashboard publicly.

That is intentional for simplicity and safety.

---

## Summary deployment checklist

1. Install Docker Engine + Compose plugin
2. Point your domain to the VPS
3. Open ports `80` and `443`
4. Clone the repo
5. Copy `.env.example` to `.env`
6. Set `APP_DOMAIN` and `ACME_EMAIL`
7. Run:

```bash
docker compose up -d --build
```

8. Verify with:

```bash
docker compose ps
docker compose logs -f traefik
docker compose logs -f app
```

9. Open:

```txt
https://YOUR_DOMAIN
```
