# Understanding Cron on a VPS

`cron` runs commands on a schedule.

Typical uses on a VPS:

- nightly backups
- cleanup jobs
- health checks
- certificate renewal hooks
- periodic app or server maintenance scripts

For most simple tasks, the easiest place to start is your user crontab.

---

## The command you usually want

Edit your user crontab:

```bash
crontab -e
```

List current jobs:

```bash
crontab -l
```

After saving, cron will pick up the change automatically. You usually do **not** need to restart the cron service.

---

## Cron syntax

A normal cron entry has **5 time fields + 1 command**:

```txt
* * * * * command-to-run
- - - - -
| | | | └ day of week (0-7, Sun = 0 or 7)
| | | └── month (1-12)
| | └──── day of month (1-31)
| └────── hour (0-23)
└──────── minute (0-59)
```

Useful patterns:

- `*` → every value
- `*/5` → every 5 units
- `1,15` → a list
- `1-5` → a range

Examples:

```cron
# every day at 02:30
30 2 * * * /home/max/scripts/backup.sh

# every 5 minutes
*/5 * * * * /home/max/scripts/check.sh

# every Sunday at 04:05
5 4 * * 0 /home/max/scripts/cleanup.sh
```

Important gotcha: if **day of month** and **day of week** are both restricted, cron runs when **either** matches.

---

## User crontab vs system cron

### User crontab

Use `crontab -e` for jobs that should run as **your current user**.

Example:

```cron
30 2 * * * /home/max/scripts/backup.sh
```

### System cron

`/etc/crontab` and files in `/etc/cron.d/` have an **extra user field**:

```cron
30 2 * * * root /usr/local/bin/backup.sh
```

Also common on Debian/Ubuntu:

- `/etc/cron.hourly/`
- `/etc/cron.daily/`
- `/etc/cron.weekly/`
- `/etc/cron.monthly/`

Those are mainly for system-wide maintenance jobs.

---

## Most common cron mistakes

### 1) Using relative paths

Cron runs with a minimal environment. Use **absolute paths**:

```cron
*/5 * * * * /usr/bin/php /home/max/app/script.php
```

not:

```cron
*/5 * * * * php script.php
```

### 2) Assuming your normal shell environment exists

Cron does **not** run with your full interactive shell setup.

Useful variables you can set at the top of the crontab:

```cron
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""
```

Notes:

- cron commonly uses `/bin/sh` by default
- `MAILTO=""` disables cron mail
- use a real email address if you want cron output mailed to you

### 3) Forgetting about output

If a cron job prints output, cron may try to mail it to the crontab owner.

For predictable debugging, redirect output yourself:

```cron
30 2 * * * /home/max/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### 4) Not testing the script manually first

Always run the command yourself before scheduling it.

---

## Debugging cron jobs

First check that cron is running:

```bash
sudo systemctl status cron
```

Then:

- inspect your script’s own log file if you redirected output
- check service logs with:

```bash
journalctl -u cron
```

On Ubuntu, cron messages often also appear in syslog, so this is often useful too:

```bash
grep CRON /var/log/syslog
```

---

## Additional resources

- Ubuntu manpage: `crontab(5)`  
  https://manpages.ubuntu.com/manpages/noble/man5/crontab.5.html
- Ubuntu manpage: `cron(8)`  
  https://manpages.ubuntu.com/manpages/noble/man8/cron.8.html
- Ubuntu manpage: `anacron(8)`  
  https://manpages.ubuntu.com/manpages/focal/man8/anacron.8.html
