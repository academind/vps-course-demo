# Automated Deployments (of a Web App) with GitHub Actions

Often, you may not want to manually deploy (copy + run) your project files. Instead, you may want an automated system where you simply push your changes to GitHub and the new version of the web app gets re-deployed automatically.

For this project, one possible automation is using GitHub Actions:

1. Keep the repo cloned on the VPS
2. Keep the real `.env` only on the VPS
3. Let GitHub Actions connect to the VPS
4. Update the checked-out code on the server (via GitHub Actions)
5. Run `docker compose up -d --build` (via GitHub Actions)

Of course, you can also use many other CI / CD providers.

---

## One-time prep on the VPS

Before you automate anything, do one manual deployment first.

1. Install Docker Engine + Docker Compose plugin
2. Clone the repo to the VPS, e.g. `~/vps-demo-app`
3. Create the real `.env` from `.env.example`
4. Make sure the deploy user can run `git` and `docker compose`
5. Verify `docker compose up -d --build` works once

Important:

- Use a **non-root** deploy user
- Keep `.env` on the server; do **not** commit it
- If the repo is private, server-side GitHub access must already work

---

## Recommended GitHub setup

Create a GitHub **environment** called `production` and store deploy secrets there.

Also useful:

- add a required reviewer to the `production` environment if you want a manual approval gate
- use a concurrency group so two deployments never run at the same time

Then choose one of the two options below.

---

## Option 1: Deploy over public SSH (without Tailscale)

Use this when you want the simplest setup.

### Secrets

- `VPS_HOST` → the public IP or public DNS name of the VPS
- `VPS_USER` → the deploy user on the VPS (e.g. `max` if that’s the username you chose on the VPS)
- `SSH_PRIVATE_KEY` → the private key GitHub Actions should use for that deploy user
- `SSH_KNOWN_HOSTS` → the server’s SSH host key entry

Create `SSH_KNOWN_HOSTS` from a **trusted machine** with the exact hostname you will use in the workflow:

```bash
ssh-keyscan -H your-server-hostname
```

### Important note

This setup is accurate and common, but SSH stays internet-facing.

GitHub’s docs also note that GitHub-hosted runners use a lot of IP ranges and are **not** a good fit for a simple SSH IP allowlist. If you want SSH access to stay private, prefer the Tailscale option below.

### Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: production
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    env:
      VPS_HOST: ${{ secrets.VPS_HOST }}
      VPS_USER: ${{ secrets.VPS_USER }}
      GIT_SHA: ${{ github.sha }}

    steps:
      - name: Configure SSH
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          printf '%s\n' "${{ secrets.SSH_KNOWN_HOSTS }}" > ~/.ssh/known_hosts
          chmod 644 ~/.ssh/known_hosts

      - name: Deploy
        run: |
          ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$VPS_USER@$VPS_HOST" "bash -se" <<EOF
          set -e
          cd ~/vps-demo-app
          git fetch --prune origin
          git checkout main
          git reset --hard "$GIT_SHA"
          docker compose up -d --build
          docker compose ps
          EOF
```

### What this does

- connects to the VPS over SSH
- fetches the latest Git data
- resets the server repo to the **exact commit** that triggered the workflow
- rebuilds and restarts the containers
- leaves `.env` and Docker volumes in place

Note: there is no `actions/checkout` step here because the VPS already has the repository.

---

## Option 2: Deploy over Tailscale

Use this when you **do not want public SSH exposure**.

Your original Tailscale recommendation was accurate: plain SSH **over** Tailscale works fine.

But there is a simpler version: use **Tailscale SSH**. That removes the SSH private key and `known_hosts` setup from the workflow.

### One-time Tailscale prep

1. Install Tailscale on the VPS and join it to your tailnet
2. Enable Tailscale SSH on the VPS:

   ```bash
   sudo tailscale set --ssh
   ```

3. Note the VPS’s MagicDNS hostname or `100.x` address
4. In your Tailscale policy, allow your CI tag to:
   - reach the VPS over the network
   - SSH to the VPS as your deploy user
5. Create Tailscale credentials for GitHub Actions
   - **recommended:** workload identity federation
   - **simpler fallback:** OAuth client
6. Once the workflow works, close public SSH access if you want SSH only over Tailscale

### Secrets

- `VPS_TAILSCALE_HOST` → the VPS’s MagicDNS name or Tailscale IP
- `VPS_USER` → the deploy user on the VPS
- `TS_CLIENT_ID` → the Tailscale federated identity client ID
- `TS_AUDIENCE` → the Tailscale audience value

If you use a Tailscale OAuth client instead of workload identity federation, also add:

- `TS_OAUTH_SECRET`

### Workflow

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: production
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    permissions:
      id-token: write
    env:
      VPS_HOST: ${{ secrets.VPS_TAILSCALE_HOST }}
      VPS_USER: ${{ secrets.VPS_USER }}
      GIT_SHA: ${{ github.sha }}

    steps:
      - name: Connect runner to Tailscale
        uses: tailscale/github-action@v4
        with:
          oauth-client-id: ${{ secrets.TS_CLIENT_ID }}
          audience: ${{ secrets.TS_AUDIENCE }}
          tags: tag:ci
          ping: ${{ secrets.VPS_TAILSCALE_HOST }}

      - name: Deploy over Tailscale SSH
        run: |
          ssh -o BatchMode=yes "$VPS_USER@$VPS_HOST" "bash -se" <<EOF
          set -e
          cd ~/vps-demo-app
          git fetch --prune origin
          git checkout main
          git reset --hard "$GIT_SHA"
          docker compose up -d --build
          docker compose ps
          EOF
```

### Notes

- Even with workload identity federation, the Tailscale action input is still called `oauth-client-id`
- `id-token: write` is needed for workload identity federation
- If you use an OAuth client instead, replace:

```yaml
audience: ${{ secrets.TS_AUDIENCE }}
```

with:

```yaml
oauth-secret: ${{ secrets.TS_OAUTH_SECRET }}
```

and you can remove `id-token: write`

If you do **not** want to use Tailscale SSH, standard SSH over Tailscale also works. But then you keep the `SSH_PRIVATE_KEY` and `SSH_KNOWN_HOSTS` setup from Option 1, so the workflow is a bit longer.

---

## Good practices

- Keep the workflow focused on **updates**, not first-time server provisioning
- Deploy with a dedicated **deploy user**, not `root`
- Keep the server repo clean; the workflow resets it to the pushed commit
- Put deploy credentials in a GitHub **environment**, not directly in the repo
- Add CI steps before deploy later, e.g. build/tests, then make `deploy` depend on them

---

## Additional resources

- GitHub Docs: Deploying with GitHub Actions  
  https://docs.github.com/en/actions/concepts/use-cases/deploying-with-github-actions
- GitHub Docs: GitHub-hosted runners reference  
  https://docs.github.com/en/actions/reference/github-hosted-runners-reference
- Tailscale Docs: Tailscale GitHub Action  
  https://tailscale.com/docs/integrations/github/github-action
- Tailscale Docs: Tailscale SSH  
  https://tailscale.com/docs/features/tailscale-ssh
- Tailscale Docs: Connect GitHub CI/CD workflows to private infrastructure without public exposure  
  https://tailscale.com/docs/solutions/connect-github-CICD-workflows-to-private-infrastructure-without-public-exposure
- Docker Docs: `docker compose up`  
  https://docs.docker.com/reference/cli/docker/compose/up/
