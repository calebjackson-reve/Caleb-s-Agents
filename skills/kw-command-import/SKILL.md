---
name: kw-command-import
description: Stage Keller Williams Command contact imports from the official two-row CSV template without losing its grouped and field header rows.
---

# KW Command Import

## What it does

Reads the official template as two header rows, maps fields from row 2, and writes both rows unchanged before staged contact records.

## When to use

Use when transforming a roster or CRM export into the official Command import CSV. Keep upload as a separate, explicitly authorized action.

## Exact code pattern

```python
with template.open(newline="", encoding="utf-8-sig") as stream:
    reader = csv.reader(stream)
    group_headers = next(reader, [])  # row 1: group labels
    field_headers = next(reader, [])  # row 2: actual field names
if len(group_headers) != len(field_headers):
    raise ValueError("Command template header rows have different widths")
fields = map_fields(field_headers)

with output.open("w", newline="", encoding="utf-8") as stream:
    writer = csv.writer(stream)
    writer.writerow(group_headers)
    writer.writerow(field_headers)
    writer.writerows(staged_rows)
```

Map by normalized row-2 names, preserve every column and ordering exactly, compare normalized email/phone identifiers against the fresh roster, and attach a batch tag. Hash inputs and emit `uploaded=false` in the manifest.

Known bug pattern: code that calls `next(csv.reader(stream))` once and parses that result as field names reads row 1 and fails against the real template.

## Failure it prevents

Prevents parsing group labels as fields, shifting contact values into the wrong columns, destroying the official template shape, and treating staging as authorization to upload.
