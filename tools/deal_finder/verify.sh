#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p test_deal_finder.py -v
PYTHONDONTWRITEBYTECODE=1 python3 tools/deal_finder/deal_finder.py tools/deal_finder/sample/zachary_sample.csv --today 2026-10-12
