---
name: ma-expo-workspace-setup
description: Sets up Claude Code inside an editor (Antigravity or VS Code with the Claude Code extension), scaffolds an Expo + React Native workspace with one prompt, and gets the app running on a real phone through Expo Go and a QR code. Use when Caleb says "start a new mobile app", "scaffold an Expo project", "get this running on my phone", "open an Expo server", "the QR code isn't showing", or is beginning any AIRE or Keller Williams app build from an empty folder.
---

# Expo Workspace Setup and the Phone Test Loop

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapters 5-6 and 9 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=263s and https://www.youtube.com/watch?v=BMMcmmnjrM8&t=954s), plus the "new terminal window" lesson in chapter 14 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=3296s)

## What Nick teaches

### Getting Claude Code in front of you

1. Sign up at claude.ai (email or Google). Nick says the Pro plan at about $20/month is enough for the course and "probably the highest return on investment you will ever get." He is on Max. Learn from the source first, experiment with cheaper models later.
2. The chat page is "vanilla Claude." To build apps you need Claude Code, which you can use in the web app, the desktop app, or inside an editor. Nick strongly prefers the editor because you see every file on the left and can build "much more sophisticated apps."
3. Nick uses Antigravity (Google's editor). Download it, drag to Applications, close the Google agent panel, go to Extensions, search "Claude Code for VS Code", install it. A small Claude icon then appears everywhere. Double-click to open a file, click the icon, and you have a Claude Code chat with the "little space invader."
4. If it does not respond, run `/login`, choose "Claude account with subscription," and log in through the browser page it opens.
5. Open Folder, create a new folder for the project, reopen the Claude Code terminal (Antigravity will keep trying to push its own agent, so close that one).
6. Sanity check: `Hey, make me a really simple one-page site in the current directory, then open it.` Then `Adjust this so it greets me, Nick.` Watch the file change. "All of these are just wrappers around the brain of the model."

### Scaffolding Expo

1. `/clear` first to drop previous conversation history and keep the token count low.
2. Delete anything left in the folder (the index.html from the sanity check).
3. Prompt: `I want to build a mobile app with Expo and React Native. Set up my workspace for me.` Claude already knows Expo's file layout, so no template download is needed.
4. First time only: open Claude Code settings and turn on "allow dangerously skip permissions" so Claude can run without waiting on you for every command. Nick does this.
5. Then: `Create a simple demo application, some habit tracker for demo purposes, and then let me launch it on my phone.` Expect about 1.5 to 2 minutes of planning, then a build. Errors during the build are normal. Claude is "capable of solving its own problems."
6. The demo stores data locally (no database) because that is what "demo" implies.

### Getting it on your phone

1. Install **Expo Go** from the App Store or Play Store. Create an Expo account and log in.
2. Claude will tell you to run `npx expo start` yourself. Do not. Nick: "one of the highest-star things you can start doing right now is just asking it to do it for you." Say: `Do this for me in a new terminal window.` Claude opens a terminal it manages and a big QR code appears.
3. Scan the QR with the phone camera, open the `exp://` link, enter your passcode, the app loads in Expo Go.
4. The phrase **"new terminal window"** matters. If Claude starts the server inside its own thread, you cannot get the QR flow. Nick had to repeat: `Make sure it's a fresh terminal, e.g. not inside of this thread, but actually on my computer terminal.`
5. Test on the phone itself, not just a mirror. Nick found an entire "create a new habit" page he did not know existed until he used his thumb.

### Restarting the server

Ctrl+C in the terminal to stop it, clear, press up-arrow to rerun the last command, rescan the QR.

### When the phone build errors

Copy every error message and paste it into Claude. Example from the course: "AsyncStorage v3 isn't compatible with Expo Go," so Claude downgraded to v2.2.0 and the restart worked. Another: "CommandError: failed to start tunnel" turned out to be the tunnel provider (ngrok) wanting email verification. Nick pasted the same error three or four times before Claude found it.

## Step by step

1. Confirm Claude Code is logged in (`/login` if needed) and the project folder is open in the editor.
2. `/clear`.
3. Send the scaffold prompt. Wait for the workspace.
4. Send the demo prompt with "then let me launch it on my phone."
5. When Claude hands you `npx expo start` instructions, reply: `Do this for me in a new terminal window on my computer so I can see the QR code.`
6. Scan with Expo Go. Walk every screen with your thumb.
7. Paste any red error text back into Claude verbatim. Restart the server with Ctrl+C, up-arrow, Enter, rescan.
8. Once the demo runs on the phone, run `/init` (see `ma-claude-md-context-hygiene`) before building the real thing.

## Templates / prompts

```
I want to build a mobile app with Expo and React Native. Set up my workspace for me.
```

```
Create a simple demo application, a [showing feedback / open house sign-in] tracker for demo purposes, and then let me launch it on my phone.
```

```
Start an Expo server for this in a new terminal window. When I say Expo server I mean run it in a terminal on my computer, not inside this thread, so I can scan the QR code with my phone.
```

```
Getting this when I open the app in Expo Go:
[paste full error]
Fix it and restart the server.
```

Folder convention Nick lands on after regretting "example project":

```
~/apps/
  habit-tracker/     (one folder per app, named for the app, not "example project")
  cal-tracker/
  pomodoro-app/
```

## Pitfalls Nick calls out

- Naming the folder "example project" and then having to rename the repo, the folder, and the README later. Name things properly from the start.
- Reopening a folder in the editor resets your Claude session. Expect to lose the thread.
- Claude hands you terminal commands because of how it was trained on how-to guides. Ask it to run them. "That does 80 to 90% of the work."
- A server started inside Claude's own thread cannot show you the QR code.
- iPhone mirroring is tiny and cannot show haptics or sound. Use the real phone for the final pass.
- Tunnel providers may suspend you after a few servers until you verify your email.
- Prices, plan names, and editor behavior are as Nick described them and may have changed.

## How Caleb should use this

- Spin up a fresh folder per app: `aire-showings`, `kwfc-open-house`, `listing-walkthrough`. One folder, one CLAUDE.md, one GitHub repo each.
- Use the demo prompt to prototype an open house sign-in app (name, phone, email, agent, "are you working with an agent?") and get it on his phone in one sitting before adding any CRM sync.
- Keep Expo Go installed on his phone so any AIRE prototype can be shown to a seller or the KW team in minutes without a store listing.
- Turning on "dangerously skip permissions" lets Claude run commands freely. Fine for a sandboxed app folder, but Caleb should not use it in folders with client data or live credentials.
- No cost beyond the Claude subscription at this stage. Store accounts and paid plans come later and need Caleb's approval.

## Verification

- `localhost:8081` (or the port Claude reports) opens the app in Chrome.
- A QR code is visible in a terminal window on the computer, not buried in the Claude thread.
- Expo Go on the phone loads the app with no red error bar at the bottom.
- Every tab and screen has been tapped on the phone at least once.
