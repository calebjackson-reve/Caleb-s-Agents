import json, sys
name, label, url = sys.argv[1], sys.argv[2], sys.argv[3]
def load(v):
    try: return json.load(open(f'{name}/{v}/evidence.json'))
    except Exception: return None
e, m = load('desktop'), load('mobile')
def row(k, d): v = d.get(k) if d else None; return f"{v['fontFamily'].split(',')[0].strip(chr(34))} {v['fontSize']} / {v['fontWeight']} / lh {v['lineHeight']} / ls {v['letterSpacing']} / {v['textTransform']}" if v else 'none'
def base(d): return f"{d['base']['fontFamily'].split(',')[0].strip(chr(34))} {d['base']['fontSize']} / lh {d['base']['lineHeight']}" if d else 'n/a'
out = [f"# {label}, measured October 19, 2026", "", f"Source: {url} captured with aire/research/reference-capture. Full captures and recordings are in the private evidence pack, not in the repo.", "",
       "| | Desktop 1440x900 | Mobile 390x844 |", "|---|---|---|",
       f"| Page height | {e['pageHeight'] if e else 'n/a'} px | {m['pageHeight'] if m else 'n/a'} px |", f"| Base | {base(e)} | {base(m)} |",
       f"| h1 | {row('h1', e)} | {row('h1', m)} |", f"| h2 | {row('h2', e)} | {row('h2', m)} |", f"| p | {row('p', e)} | {row('p', m)} |", f"| nav link | {row('nav', e)} | {row('nav', m)} |", f"| button | {row('button', e)} | {row('button', m)} |",
       f"| Sections over 80 px | {len(e['sections']) if e else 'n/a'} | {len(m['sections']) if m else 'n/a'} |", f"| Grids | {len(e['grids']) if e else 'n/a'} | {len(m['grids']) if m else 'n/a'} |",
       f"| @font-face rules | {len(e['fontFaces']) if e else 'n/a'} | {len(m['fontFaces']) if m else 'n/a'} |", f"| Font files requested | {len(e['fontRequests']) if e else 'n/a'} | {len(m['fontRequests']) if m else 'n/a'} |", ""]
if e:
    fam = sorted(e['fontFamiliesInUse'].items(), key=lambda x: -x[1])[:4]
    out += ["## Font families in use, desktop (element count)"] + [f"- {f.split(',')[0].strip(chr(34))}: {n}" for f, n in fam] + [""]
    out += ["## Section heights, desktop", "| Tag | Class | Top | Height | Grid columns |", "|---|---|---|---|---|"] + [f"| {s['tag']} | {s['cls'][:40]} | {s['top']} | {s['height']} | {s['gridTemplateColumns'] or ''} |" for s in e['sections'][:24]] + [""]
    out += ["## Grids, desktop"] + [f"- {g['cls'][:50] or '(no class)'}: {g['columns']} gap {g['gap']} width {g['width']}" for g in e['grids'][:12]] + [""]
    out += ["## Font faces and files"] + [f"- @font-face {f['family']} {f['weight']}: {f['src'][:120]}" for f in e['fontFaces'][:8]] + [f"- file: {u}" for u in e['fontRequests'][:8]] + [""]
    if e.get('virtualScroll'): out += ["## Scroll model", f"- Virtual scroll on desktop: wrapper `{e['virtualScroll']['wrapperClass']}` {e['virtualScroll']['wrapperHeight']} px tall, body overflow hidden. Wheel input is ignored in headless, so the desktop full page was captured with the natural layout forced (transforms off). Section heights are from the live transforms, not the forced layout.", ""]
out += ["## Unknowns", "- Motion easing and durations are only in the recordings, not measured as numbers. Read the webm frame by frame if a value is needed.", "- Hero media is video or lazy image. Load timing is not measured."]
open(f'{name}/{name.upper()}-measured.md', 'w').write('\n'.join(out)); print('wrote', f'{name}/{name.upper()}-measured.md')
