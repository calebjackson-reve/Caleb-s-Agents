---
name: cc-permission-modes
description: Explains and configures Claude Code permission modes (ask before edits, accept edits, plan, bypass permissions, delegate) and the /permissions allow, ask and deny rules, including how Nick Saraev enables bypass permissions and when he uses each mode. Use when Caleb asks "which mode should I be in", "Claude keeps asking me every five seconds", "how do I turn on bypass permissions", "is bypass safe", or wants to lock down what Claude can touch in a client-data workspace.
---

# Permission Modes and Tool Permissions

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapter 13 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=3313s), with the Shift+Tab cycling tip from chapter 4 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=485s)

## What Nick teaches

Permission mode controls how the agent handles permission checks. In the terminal you cycle modes with Shift+Tab. In the VS Code or Antigravity GUI there is a button at the bottom left of the chat that cycles through four modes, and the border color changes with the mode. Subagents inherit the main conversation's mode, with a few cases where they can override.

The modes as he describes them:

| Mode | What it does | Nick's take |
|---|---|---|
| Ask before edits (default) | Before changing any file it shows the diff and asks: 1 yes, 2 yes for all edits this session, 3 no, or tell Claude what to do instead | Safe. Used for high-risk codebases where every change must be right. Very few people use it now. |
| Edit automatically (accept edits) | Auto-accepts edits to existing files, still asks before creating new ones | Good middle ground. Carte blanche on existing files, no new files without a nod. |
| Plan mode | Read-only exploration: web research, file reading, first-principles reasoning, writes a plan document for you to approve | Nick uses it for any build more complex than a simple design. See `cc-plan-mode-full-stack-build`. |
| Bypass permissions (dangerously skip permissions) | Does whatever it wants, including creating and deleting files | What Nick runs almost all the time for knowledge work and builds. Carries real risk. |
| Delegate | Coordination mode for an agent team lead, only team management tools allowed | Relevant only with agent teams. |

Bypass permissions is not available out of the box in the GUI. To enable it: Extensions tab, Claude Code for VS Code, gear icon, Settings, tick "Claude Code: Allowed Dangerously Skip Permissions". The setting warns it is recommended only for sandboxes with no internet access. Nick accepts the risk, and says accept it at your own.

The risk story he tells: someone running bypass on Linux had Claude misinterpret a request, run a recursive delete command (he recalls it as something like `sudo rm -rf`) and wipe the drive. He calls this vanishingly rare but possible. The more common cost of bypass is workspace bloat: Claude tries approaches, pulls libraries, writes temp JSONs, and over time you can have thousands of junk files slowing your machine and Claude. Periodically ask Claude to go through the workspace and remove what is no longer required.

Fine-grained control lives at `/permissions` (terminal). It opens a tab with Allow, Ask, Deny and Workspace sections. You add a rule by naming a tool (Bash, WebFetch, Edit, a specific MCP tool and so on) and choosing allow, ask or deny. Deny always rejects, Ask always confirms, Allow never asks.

GUI extras worth knowing from the same section: the pause button at the bottom right stops an execution mid-run so you can redirect it, and the Thinking tab shows Claude's internal reasoning as it works.

## Step by step

1. Decide the risk level of the workspace. Client data, money or anything that sends messages: start in ask-before-edits or accept-edits. Throwaway builds and research: bypass.
2. To enable bypass in the GUI: Extensions, Claude Code, gear, Settings, tick Allowed Dangerously Skip Permissions. Reopen the mode picker.
3. In terminal, press Shift+Tab until the status line shows the mode you want.
4. For any workspace with external side effects, run `/permissions` and add Deny or Ask rules for the dangerous tools (for example Ask on Bash, Deny on any MCP send-email tool).
5. Every few weeks in a bypass workspace: "Go through this workspace and list files, temp JSONs and libraries that are no longer required. Do not delete yet, show me the list."
6. When Claude is mid-run and heading the wrong way, hit pause, switch mode if needed, and give the new instruction.

## Templates / prompts

Permission rule set for an AIRE workspace that touches the CRM:

```text
/permissions
  Allow: Read, Glob, Grep, Edit, Write (inside this workspace)
  Ask:   Bash, WebFetch
  Deny:  any MCP tool that sends email, SMS or posts to social
```

Cleanup prompt:

```text
Go through this workspace and identify anything that isn't required anymore: temp files, unused libraries, leftover JSON, duplicate scripts. List them with a one-line reason each. Do not delete anything until I say so.
```

Redirect mid-run (Nick's exact phrasing after hitting pause):

```text
No plan, just do it.
```

## Pitfalls Nick calls out

- Staying in ask-before-edits for a long build. Claude asks every five seconds and you lose the productivity gain.
- Running bypass with no backups and no git history on a folder you care about.
- Letting bypass bloat the workspace into thousands of temp files.
- Assuming subagents have a different mode than the parent. They inherit it.
- Expecting bypass to be in the GUI picker without flipping the extension setting first.

## How Caleb should use this

- AIRE repos that read the CRM and draft messages: accept-edits plus `/permissions` Ask on Bash and Deny on any sending tool. Anything that actually sends a text or email needs Caleb's approval before running.
- Listing microsites, open house landing pages, content drafts: bypass is fine, the worst case is a bad draft.
- Scripts that touch the Supabase or Stripe keys for AIRE: never bypass on a first run. Review the diff.
- Keep a monthly cleanup prompt for the bypass workspaces so the machine stays fast.

## Verification

- The status line (terminal) or the mode button (GUI) shows the intended mode and the chat border color matches.
- In ask mode, a test edit produces the 1/2/3 prompt. In accept-edits, an existing-file edit goes through silently but a new file still prompts.
- `/permissions` lists the Deny rules and a request to use a denied tool is refused.
