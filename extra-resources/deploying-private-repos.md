# Pulling from a Private GitHub Repository with a Deploy Key

If your VPS should pull from a **private** GitHub repository, a good simple option is a **deploy key**.

A deploy key is an SSH key that is attached to **one repository**. The public key is stored on GitHub, the private key stays on your server.

This is a good fit when:

- one VPS pulls one private repo
- the server only needs **read** access
- you want something simpler than a machine user or GitHub App

For deployment, keep the deploy key **read-only**.

---

## 1) Generate a dedicated SSH key on the VPS

Log in as your normal deploy user and create a new key pair:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "deploy key for OWNER/REPO" -f ~/.ssh/repo_deploy_key
```

For automated pulls, use an **empty passphrase** when prompted.

This creates:

- `~/.ssh/repo_deploy_key` → private key
- `~/.ssh/repo_deploy_key.pub` → public key

Set safe permissions:

```bash
chmod 600 ~/.ssh/repo_deploy_key
chmod 644 ~/.ssh/repo_deploy_key.pub
```

Important: use a **dedicated deploy key**, not your personal GitHub SSH key.

---

## 2) Add the public key as a Deploy Key on GitHub

On GitHub:

1. Open the private repository
2. Go to **Settings** → **Deploy keys**
3. Click **Add deploy key**
4. Give it a name
5. Paste the contents of `~/.ssh/repo_deploy_key.pub`
6. **Do not** enable write access

You can print the public key with:

```bash
cat ~/.ssh/repo_deploy_key.pub
```

---

## 3) Tell SSH to use that key for GitHub

Create or edit `~/.ssh/config` on the VPS:

```sshconfig
Host github.com
  User git
  IdentityFile ~/.ssh/repo_deploy_key
  IdentitiesOnly yes
```

Then protect the file:

```bash
chmod 600 ~/.ssh/config
```

This makes Git use the deploy key whenever it connects to GitHub over SSH.

---

## 4) Trust GitHub’s SSH host key

Add GitHub to `known_hosts`:

```bash
ssh-keyscan github.com >> ~/.ssh/known_hosts
chmod 644 ~/.ssh/known_hosts
```

Best practice: verify the fingerprint against GitHub’s published SSH fingerprints before trusting it.

---

## 5) Test the connection

Run:

```bash
ssh -T git@github.com
```

A successful test ends with a message like:

```txt
You've successfully authenticated, but GitHub does not provide shell access.
```

---

## 6) Clone or switch the repo to SSH

For a fresh clone:

```bash
git clone git@github.com:OWNER/REPO.git ~/vps-demo-app
```

If the repo is already on the server and currently uses HTTPS, switch it to SSH:

```bash
cd ~/vps-demo-app
git remote set-url origin git@github.com:OWNER/REPO.git
git pull
```

From now on, `git fetch`, `git pull`, and deployment scripts on the VPS will use the deploy key.

---

## Important limitation

A deploy key only works for **one repository**.

If the same server needs to pull from multiple private repos:

- create **one deploy key per repo**, and
- use separate SSH host aliases in `~/.ssh/config`

If you need broader or more temporary access, GitHub recommends considering a **GitHub App** instead.

---

## Revoke access later

To remove access:

- delete the deploy key in the repository’s **Deploy keys** settings
- delete the private key from the VPS

---

## Additional resources

- GitHub Docs: Managing deploy keys  
  https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys
- GitHub Docs: Cloning a repository  
  https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository
- GitHub Docs: GitHub’s SSH key fingerprints  
  https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
