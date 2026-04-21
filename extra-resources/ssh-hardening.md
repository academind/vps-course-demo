# SSH Hardening on a New VPS

## The safe order

Do **not** disable root login or password authentication until all of this is true:

1. You created a normal admin user.
2. That user can log in with your SSH key.
3. SSH is allowed through the firewall.
4. You tested the new login in a **second terminal**.

Keep your current root session open until the very end. Also make sure you know how to reach your VPS provider’s **recovery / web console** before you start.

---

## 1) Update the server first

Log in once as `root` and bring the system up to date:

```bash
apt update && apt upgrade -y
```

A fresh VPS is often already being scanned on the public internet. Patching first reduces easy wins for attackers.

---

## 2) Create a normal admin user

Create a dedicated admin user and give it `sudo` access:

```bash
adduser <user>
usermod -aG sudo <user>
```

Best practice: use a normal account for day-to-day admin work and reserve `root` for bootstrap / recovery only.

---

## 3) Put your SSH key on that user

If you **already logged in as root with an SSH key**, copy that authorized key to the new user:

```bash
install -d -m 700 -o <user> -g <user> /home/<user>/.ssh
cp /root/.ssh/authorized_keys /home/<user>/.ssh/authorized_keys
chown <user>:<user> /home/<user>/.ssh/authorized_keys
chmod 600 /home/<user>/.ssh/authorized_keys
```

If you **don’t have an SSH key yet**, create one on your **local machine** and use it instead of passwords:

```bash
ssh-keygen -t ed25519 -C "your-name@your-device"
ssh-copy-id <user>@<server-ip>
```

Notes:

- `ed25519` is the recommended default for new SSH keys.
- Put a **passphrase** on your private key (for encryption).
- Never copy your **private** key to the server!

---

## 4) Enable the firewall safely

On Ubuntu, a simple baseline is UFW. **Allow SSH before enabling the firewall**:

```bash
ufw allow OpenSSH
ufw enable
ufw status
```

If your VPS provider offers a **network firewall / security group** (e.g., Hetzner Firewall), use that too.

Best practice: if possible, allow SSH **only from your own IP** or only over a VPN / Tailscale / WireGuard. That is stronger than just leaving port 22 open to the whole internet.

For Tailscale + Hetzner (as an example), see [their docs](https://tailscale.com/docs/install/cloud/hetzner).

When using Tailscale, make sure you connect to your private Tailscale IP, NOT the VPS public IP!

---

## 5) Test the new user before touching SSH config

Open a **second terminal** on your local machine and try the new account:

```bash
ssh <user>@<server-ip>
sudo whoami
```

If `sudo whoami` prints `root`, the account works.

**Do not continue** until this succeeds.

---

## 6) Harden SSH itself

On Ubuntu, prefer a config snippet in `/etc/ssh/sshd_config.d/`.

Important: Ubuntu reads `sshd_config.d/*.conf` **before** the main `sshd_config`, and for most SSH settings the **first value wins**. That means provider or cloud-init snippets may already set options there. So either:

- inspect existing files in `/etc/ssh/sshd_config.d/`, or
- use an **early-loading** file such as `00-hardening.conf`

You can copy the provided `extra-resources/hardening.conf` file to your server and save it as `/etc/ssh/sshd_config.d/00-hardening.conf`.

The minimum hardening rules in that file are:

```
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
X11Forwarding no
```

These settings do the core hardening work:

- `PermitRootLogin no` → no direct SSH login as `root`
- `PasswordAuthentication no` → no password-based SSH login
- `KbdInteractiveAuthentication no` → closes another common password-like auth path
- `PubkeyAuthentication yes` → keep key-based login enabled

Optional extra once your usernames are stable:

```txt
AllowUsers <user>
```

That further limits which accounts may log in over SSH.

---

## 7) Validate config, then reload SSH

Never reload blindly. Test first:

```bash
sudo sshd -t
sudo systemctl reload ssh
```

Why this matters:

- `sshd -t` checks syntax
- `reload` is safer than making changes and hoping for the best

Keep your existing SSH sessions open while you do this.

---

## 8) Test again with a brand-new SSH connection

Now open **another fresh terminal** and connect again:

```bash
ssh <user>@<server-ip>
```

If that works, your hardening changes are in place and you can safely close the original root session.

---

## 9) Add brute-force protection

Disabling password auth already removes most brute-force risk, but adding Fail2Ban is still a good extra layer:

```bash
sudo apt update && sudo apt install fail2ban -y
```

Tweak fail2ban config in `/etc/fail2ban/jail.d/sshd.local`:
```
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
```

Then run:
```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

Do **not** edit `jail.conf` directly. Use `jail.local` or a file in `jail.d/` so package updates do not overwrite your changes.

---

## 10) Turn on automatic security updates

Ubuntu Server usually includes `unattended-upgrades`, but verify it instead of assuming.

Install it if needed:

```bash
sudo apt install unattended-upgrades -y
```

Then make sure `/etc/apt/apt.conf.d/20auto-upgrades` contains:

```txt
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

This keeps security updates flowing even when you forget to patch manually.

---

## Good SSH hardening habits

- Use **one admin account per person**. Don’t share a single login.
- Use **SSH keys with passphrases**.
- Keep a **recovery path**: provider console, second admin key, or documented emergency access.
- Restrict SSH by **source IP** or expose it only over a **VPN** if possible.
- Don’t rely on **changing the SSH port** as your main protection. It can reduce noise, but it is not real hardening.
- Modern OpenSSH defaults are already strong; focus first on **keys-only auth, non-root access, firewalling, updates, and monitoring**.
- Remove or stop services you don’t need. Less exposed software means less attack surface.

---

## Quick checklist

- [ ] System updated
- [ ] Non-root admin user created
- [ ] SSH key works for that user
- [ ] SSH allowed in firewall
- [ ] Root SSH login disabled
- [ ] Password and keyboard-interactive SSH auth disabled
- [ ] SSH config validated and re-tested in a fresh session
- [ ] Fail2Ban enabled
- [ ] Automatic security updates enabled

---

## Additional resources

- Ubuntu Server docs: OpenSSH server  
  https://documentation.ubuntu.com/server/how-to/security/openssh-server/
- Ubuntu Server docs: Firewall / UFW  
  https://documentation.ubuntu.com/server/how-to/security/firewalls/
- Ubuntu Server docs: Automatic updates  
  https://documentation.ubuntu.com/server/how-to/software/automatic-updates/
- Ubuntu manpage: `sshd_config(5)`  
  https://manpages.ubuntu.com/manpages/jammy/man5/sshd_config.5.html
