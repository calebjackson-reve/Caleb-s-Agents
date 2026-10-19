#!/usr/bin/env python3
"""Inline the shared head and scripts fragments into every page in src/ and write them to the site root."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parents[1]
head = (root / '_head.html').read_text()
scripts = (root / '_scripts.html').read_text()
for src in sorted((root / 'src').glob('*.html')):
    html = src.read_text().replace('<!--HEAD-->', head).replace('<!--SCRIPTS-->', scripts)
    (root / src.name).write_text(html)
    print('built', src.name, len(html))
