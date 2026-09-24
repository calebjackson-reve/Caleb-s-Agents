---
name: launchd-scheduling
description: Install and verify macOS launchd calendar jobs when scheduled local-time execution must be proven from live launchd state.
---

# launchd Scheduling

## What it does

Registers calendar events with `StartCalendarInterval` and verifies the loaded service rather than trusting the generated plist.

## When to use

Use for LaunchAgents or LaunchDaemons that must run at one or more local clock times.

## Exact code pattern

```python
definition = {
    "Label": label,
    "ProgramArguments": [python, "-m", package, "--invoked-by", "launchd"],
    "StartCalendarInterval": [{"Hour": hour, "Minute": 0} for hour in hours],
}
subprocess.run(["/bin/launchctl", "bootstrap", f"gui/{os.getuid()}", str(plist)], check=True)
live = subprocess.run(
    ["/bin/launchctl", "print", f"gui/{os.getuid()}/{label}"],
    capture_output=True, text=True, check=True,
).stdout
registered = sorted({int(value) for value in re.findall(
    r'["\']?Hour["\']?\s*(?:=>|=)\s*(\d+)', live)})
assert registered == sorted(hours)
```

Treat a child argument such as `--invoked-by launchd` as self-asserted provenance. launchd gives the child no attestable token, and `kickstart` uses the same arguments.

## Failure it prevents

Prevents the silent `CalendarInterval` typo, false proof from inspecting your own plist, and overclaiming launchd invocation provenance.
