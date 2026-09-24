---
name: safe-imessage-read
description: Read Apple Messages chat.db safely when a task needs a consistent, non-mutating SQLite snapshot including WAL state.
---

# Safe iMessage Read

## What it does

Copies `chat.db`, `chat.db-wal`, and `chat.db-shm` into one temporary directory, then opens only the copy with SQLite read-only mode.

## When to use

Use for any local Messages analysis or ingest. Full Disk Access may still be required to read the source files; never bypass that macOS permission.

## Exact code pattern

```python
import shutil, sqlite3, tempfile
from pathlib import Path

temporary = tempfile.TemporaryDirectory(prefix="messages-snapshot-")
target = Path(temporary.name) / "chat.db"
for suffix in ("", "-wal", "-shm"):
    source_file = Path(f"{source}{suffix}")
    if source_file.exists():
        shutil.copy2(source_file, Path(f"{target}{suffix}"))
if not target.exists():
    temporary.cleanup()
    raise FileNotFoundError(source)
database = sqlite3.connect(f"file:{target}?mode=ro", uri=True)
```

Keep the temporary directory alive until the connection closes, then call `temporary.cleanup()`.

## Failure it prevents

Prevents writes or locks against the live Messages database and prevents silently missing committed messages that still exist only in the WAL.
