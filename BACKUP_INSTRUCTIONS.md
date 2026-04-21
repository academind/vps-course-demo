# SQLite Backup Instructions

This project includes a backup script at:

```txt
scripts/backup-sqlite-live.sh
```

The script uses SQLite's live backup method via `sqlite3`'s `.backup` command.

## Assumptions

These examples assume:

- VPS user: `<USER>`
- VPS IP: `<VPS_IP>`
- project path on VPS: `/home/<USER>/vps-demo-app`
- local script path: `./scripts/backup-sqlite-live.sh`

---

## 1) Copy the script to the VPS via `scp`

If the project already exists on the VPS, run this on your local machine:

```bash
ssh <USER>@<VPS_IP> 'mkdir -p /home/<USER>/vps-demo-app/scripts'
scp ./scripts/backup-sqlite-live.sh <USER>@<VPS_IP>:/home/<USER>/vps-demo-app/scripts/
```

Alternative with `~`:

```bash
ssh <USER>@<VPS_IP> 'mkdir -p ~/vps-demo-app/scripts'
scp ./scripts/backup-sqlite-live.sh <USER>@<VPS_IP>:~/vps-demo-app/scripts/
```

Verify on the VPS:

```bash
ssh <USER>@<VPS_IP>
ls -l /home/<USER>/vps-demo-app/scripts/backup-sqlite-live.sh
```

---

## 2) Edit the script if needed

Open the script on the VPS:

```bash
nano /home/<USER>/vps-demo-app/scripts/backup-sqlite-live.sh
```

Update this line if your DB path is different:

```bash
DB_PATH="/var/lib/docker/volumes/vps-demo-app_app_data/_data/ideas.db"
```

Save and exit:

- `Ctrl + O`, `Enter`
- `Ctrl + X`

---

## 3) Install `sqlite3` if needed

The script requires:

- `sqlite3`
- `sha256sum` (normally already present on Ubuntu)

Install `sqlite3`:

```bash
sudo apt-get update
sudo apt-get install -y sqlite3
```

Check it:

```bash
sqlite3 --version
```

---

## 4) Run the script manually

Make it executable once:

```bash
chmod +x /home/<USER>/vps-demo-app/scripts/backup-sqlite-live.sh
```

Run it:

```bash
/bin/bash /home/<USER>/vps-demo-app/scripts/backup-sqlite-live.sh
```

Or directly:

```bash
/home/<USER>/vps-demo-app/scripts/backup-sqlite-live.sh
```

Check backups:

```bash
ls -lah /home/<USER>/db-backup
```

---

## 5) Permission note

Because the DB file is likely under:

```txt
/var/lib/docker/volumes/...
```

your normal user may not be able to read it.

If you get a permission error, try:

```bash
sudo /bin/bash /home/<USER>/vps-demo-app/scripts/backup-sqlite-live.sh
```

### Important note about `sudo`

The current script uses:

```bash
BACKUP_DIR="${HOME}/db-backup"
```

If you run it with `sudo`, `$HOME` becomes root's home, so backups go to:

```txt
/root/db-backup
```

If you want backups to always go to your user's folder, set a fixed path in the script, for example:

```bash
BACKUP_DIR="/home/<USER>/db-backup"
```

---

## 6) Make sure cron is installed and running

Check status:

```bash
sudo systemctl status cron
```

If needed:

```bash
sudo apt-get update
sudo apt-get install -y cron
sudo systemctl enable --now cron
```

---

## 7) Schedule it every day at 9am

### If your normal user can read the DB file

Open your user crontab:

```bash
crontab -e
```

Add:

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

0 9 * * * /bin/bash /home/<USER>/vps-demo-app/scripts/backup-sqlite-live.sh >> /home/<USER>/backup-sqlite-cron.log 2>&1
```

Verify:

```bash
crontab -l
```

### If root is required to read the DB file

Open root's crontab:

```bash
sudo crontab -e
```

Add:

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

0 9 * * * /bin/bash /home/<USER>/vps-demo-app/scripts/backup-sqlite-live.sh >> /root/backup-sqlite-cron.log 2>&1
```

Verify:

```bash
sudo crontab -l
```

If root runs the script and it still uses `BACKUP_DIR="${HOME}/db-backup"`, backups will go to:

```txt
/root/db-backup
```

---

## 8) Schedule it every hour

### User crontab

```bash
crontab -e
```

Add:

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

0 * * * * /bin/bash /home/<USER>/vps-demo-app/scripts/backup-sqlite-live.sh >> /home/<USER>/backup-sqlite-cron.log 2>&1
```

### Root crontab

```bash
sudo crontab -e
```

Add:

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

0 * * * * /bin/bash /home/<USER>/vps-demo-app/scripts/backup-sqlite-live.sh >> /root/backup-sqlite-cron.log 2>&1
```

---

## 9) Cron timing reference

Daily at 9am:

```cron
0 9 * * *
```

Every hour at minute 0:

```cron
0 * * * *
```

---

## 10) Check the server timezone

Cron uses the VPS timezone.

Check it with:

```bash
timedatectl
```

If the server is on UTC, then `9am` means `9am UTC`.

---

## 11) Recommended first test

Before enabling cron, run the script manually once:

```bash
/bin/bash /home/<USER>/vps-demo-app/scripts/backup-sqlite-live.sh
```

That confirms:

- the script is in the right place
- `DB_PATH` is correct
- `sqlite3` is installed
- permissions are okay
- backups land where you expect
