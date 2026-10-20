# Command reader

Keeps KW Command logged in on the Mac and reads it every hour, read only. See `directive.md` for the rules.

## One-time setup on the Mac
```
cd ~/Caleb-s-Agents/aire/command-reader
~/.aire/venv/bin/pip install playwright && ~/.aire/venv/bin/playwright install chrome
security add-generic-password -s aire-command -a caleb -w        # prompts for the Command password, stored in Keychain
~/.aire/venv/bin/python command_reader.py --capture              # opens the AIRE Chrome profile; sign in to Command by hand once
```
Then the Mac session fills `SELECTORS` in `command_reader.py` from `out/*.txt` and `out/*.html`, and loads the heartbeat:
```
cp org.calebjackson.aire.command.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/org.calebjackson.aire.command.plist
```
Every 30 minutes it opens Command in the AIRE profile, which keeps the session alive. If Command logs out, it signs back in with the Keychain password and the emailed code from Gmail. If that fails twice, `out/status.json` says `login needed` and Pipeline shows it.

`python3 command_reader.py --test` runs the offline checks.
