---
name: keychain-secrets
description: Store and retrieve local macOS application secrets with the security CLI while accepting new secret values only through a hidden prompt.
---

# Keychain Secrets

## What it does

Keeps tokens and encryption keys out of source code, command arguments, configuration files, logs, and chat transcripts.

## When to use

Use for local macOS apps or agents that need persistent credentials without shipping a separate secret store.

## Exact code pattern

```python
import getpass, subprocess

value = getpass.getpass("Access token: ")
stored = subprocess.run([
    "/usr/bin/security", "add-generic-password", "-U",
    "-s", service, "-a", account, "-w", value,
], capture_output=True, text=True, check=False)
if stored.returncode:
    raise RuntimeError("could not store secret")

found = subprocess.run([
    "/usr/bin/security", "find-generic-password",
    "-s", service, "-a", account, "-w",
], capture_output=True, text=True, check=False)
secret = found.stdout.strip() if found.returncode == 0 else None
```

Never accept the value as a CLI option, paste it into chat, or print it. Pass subprocess arguments as a list and check return codes.

For expiring tokens, store a separate non-secret expiration timestamp beside the
token. Check it on every scheduled verification, warn at least 14 days early,
and make the replacement workflow use the same hidden prompt so renewal also
resets the timestamp. A refresh procedure should name the provider screen, the
getpass-only local command, and the verification command without ever showing
the token.

## Failure it prevents

Prevents secrets leaking through shell history, process listings, repositories, configuration files, logs, or model-visible conversation text.
