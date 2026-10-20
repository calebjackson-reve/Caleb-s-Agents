#!/bin/sh
# Installs the pre-push guard. Run once per clone: sh tools/install-hooks.sh
ROOT=$(git rev-parse --show-toplevel)
cat > "$ROOT/.git/hooks/pre-push" <<'H'
#!/bin/sh
cd "$(git rev-parse --show-toplevel)" && python3 tools/check-no-client-data.py || { echo "pre-push: client data found, push refused"; exit 1; }
H
chmod +x "$ROOT/.git/hooks/pre-push"
echo "pre-push hook installed"
