#!/bin/sh
# Store the Facebook page token in the macOS Keychain. Prompts hidden; nothing lands in shell history or this repo.
# Pattern from skills/keychain-secrets.
set -eu
printf 'Facebook page access token (input hidden): '
stty -echo; read -r TOKEN; stty echo; printf '\n'
security add-generic-password -U -s aire.profile-sync -a facebook_page_token -w "$TOKEN"
unset TOKEN
echo "stored: aire.profile-sync / facebook_page_token"
echo "Google: put the OAuth client JSON at ~/.config/aire-profile-sync/client_secret.json. The first run opens the consent screen."
