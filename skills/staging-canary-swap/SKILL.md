---
name: staging-canary-swap
description: Refresh a live SQLite application safely using serialization, a verified encrypted backup, a staging database, deterministic canaries, and atomic replacement.
---

# Staging Canary Swap

## What it does

Keeps partial ingest or validation failures away from the live database and leaves a recoverable pre-refresh copy.

## When to use

Use when a refresh rewrites substantial derived state in a local SQLite application that must remain usable after any failure.

## Exact code pattern

```python
with database_lock(live_path):                 # fcntl.flock(LOCK_EX)
    backup = create_encrypted_backup(live_path)
    if not verify_restore_and_integrity(backup):
        raise RuntimeError("backup verification failed")
    fd, name = tempfile.mkstemp(dir=live_path.parent, suffix=".db")
    os.close(fd)
    staging = Path(name)
    try:
        sqlite_backup_copy(live_path, staging)  # SQLite backup API, not byte copy
        refresh_only(staging)
        result = deterministic_canary(staging)
        if not result["passed"]:
            raise RuntimeError("canary failed; live database unchanged")
        checkpoint_and_close(staging)
        os.replace(staging, live_path)          # same filesystem: atomic
    finally:
        staging.unlink(missing_ok=True)
        Path(f"{staging}-wal").unlink(missing_ok=True)
        Path(f"{staging}-shm").unlink(missing_ok=True)
```

The canary should cover source-row monotonicity, uniqueness, expected row parity, decode rate, and orphan rate.

## Failure it prevents

Prevents concurrent refresh corruption, unverified backups, partial live writes, and promoting a staging database that lost or duplicated source records.
