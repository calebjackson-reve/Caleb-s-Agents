# Interface sounds for the Business Map

Rendered in code from earshot's shipped bank (no recordings), then measured with `earshot measure`. earshot pinned to commit 591fa3e0, bank forge_v2r6+forge04r1+fit1+pluck1. Rendered 2026-11-04 in a cloud session (model-free commands only).

| Role | Bank id | Render | Measured (wav) |
|---|---|---|---|
| hover | `hover_tick/detent --dur 0.14` | 0.140 s, -22.1 LUFS momentary max, clean | peak -1.0 dBFS, true peak -0.6 dBTP, attack 1 ms, decay 43 ms, brightness 7772 Hz |
| select | `click/soft` | 0.094 s, -21.8 LUFS momentary max, clean | peak -1.0 dBFS, true peak -1.0 dBTP, attack 3 ms, decay 48 ms |
| open | `ui_pop/soft` | 0.180 s, -15.4 LUFS momentary max, clean | peak -1.0 dBFS, true peak -1.0 dBTP, attack 17 ms, decay 89 ms, brightness 804 Hz |
| fly | `whoosh_fast/tight` | 0.536 s, -16.7 LUFS, clean | peak -1.0 dBFS, true peak -1.0 dBTP, attack 49 ms, decay 112 ms |
| bloom | `logo_sting/soft_bloom` | 1.850 s, -12.1 LUFS, clean | peak -1.0 dBFS, true peak -1.0 dBTP, attack 76 ms, decay 555 ms |
| answer | `notify/m4 --dur 1.2` | 1.200 s, -15.4 LUFS, clean | peak -1.0 dBFS, true peak -1.0 dBTP, attack 3 ms, decay 1009 ms |

The mp3s here are the shipped versions (44.1 kHz mono, 64 kbps). `bloom.mp3` re-measured after encoding: peak -1.2 dBFS, true peak -1.2 dBTP, -13.2 LUFS. The page plays them at these gains: hover 0.22, select 0.45, open 0.50, fly 0.40, bloom 0.55, answer 0.50, so ticks sit well under the voice.

`sfx.json` holds the six files as data URIs for `build.py`.

To re-render on the Mac:

```
earshot sfx render hover_tick/detent --dur 0.14 -o hover.wav
earshot sfx render click/soft -o select.wav
earshot sfx render ui_pop/soft -o open.wav
earshot sfx render whoosh_fast/tight -o fly.wav
earshot sfx render logo_sting/soft_bloom -o bloom.wav
earshot sfx render notify/m4 --dur 1.2 -o answer.wav
earshot measure *.wav
```
