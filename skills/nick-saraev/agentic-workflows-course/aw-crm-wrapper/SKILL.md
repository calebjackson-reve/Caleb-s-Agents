---
name: aw-crm-wrapper
description: Builds an agentic wrapper around a CRM (ClickUp in Nick's demo, any CRM with an API or MCP) so Caleb can say "new lead Jane Doe, meeting booked" and the agent creates, updates, reads and deletes records, with the choice between an MCP approach and a set of API-driven directives and CRUD scripts. Use when Caleb says "manage my CRM for me", "add this lead", "move them to under contract", "I'm tired of clicking around in the CRM", "connect AIRE to Follow Up Boss / KW Command / ClickUp", or when another AIRE workflow needs to log to the CRM.
---

# CRM Wrapper

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapter 16
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=8306s)

## What Nick teaches

Nick used ClickUp as a CRM (a space called "template creative agency" with a sales pipeline list,
statuses like intake, meeting booked, proposal sent, closed won, closed lost). "The specific tool
doesn't matter at all. You can build this in basically any CRM so long as it has an API and MCP." He
did not want to touch the CRM manually anymore, and he wanted other workflows (like onboarding) to
feed it.

**His opening prompt:** "I'd like you to be a wrapper around my ClickUp CRM. I want to be able to
ask you to do anything inside of ClickUp, then have you automate the process for me. This will also
allow us to connect to other workflows we build around my agency. All CRM information is stored
inside the 'template creative agency' space. Give me three ways we could do this."

The agent offered: (1) a direct script library with CRUD execution scripts and a master directive
that routes requests, (2) a conversational approach, (3) a webhook bridge. Nick liked option 1 but
asked "is there any simpler way, like an MCP, that wouldn't require building a step for every
request?" The agent ran a web-search sub-agent (slower, but keeps the main context clean) and found
an official and an unofficial ClickUp MCP.

**Path A, MCP:** get the API token from ClickUp settings, paste it, grab the team id from the URL,
restart Claude Code, `/mcp` shows the server. Because an MCP is general, he had to tell it: act as
my ClickUp manager, all conversations relate to this space, store that information somewhere so next
time you do it right the first time, go learn about the space first. Then "New lead, Peter Rockwell"
created the record with a meeting link and status. Limitation found: this MCP could not set custom
fields.

**Path B, API scripts:** he uninstalled the MCP and said: "Build a series of ClickUp directives so I
can automate adding records, updating them, and so on. Act as my ClickUp wrapper. I want to do this
via API calls." The agent built a base API client, CRUD scripts (create, get, update, delete), one
directive per operation, and updated the `.env` template with a `CLICKUP_API_KEY` placeholder. It
tested every script (create a task, delete it, clean up), self-annealed through errors, and Nick
then scoped it: "do all your tasks solely in the template creative agency space, update everything
to reflect this, then create a new lead called Nick." This version could read and set custom fields.

Lesson: there are almost always multiple ways. If an approach is not cooperating, abandon it halfway
and try another. "The barrier is how much time I want to spend steering." A CRM wrapper is
"non-negotiable" now, and it lets you weave flows together: new client becomes a record, triggers
onboarding, adds a comment.

## Step by step

1. Identify the CRM and confirm it has an API (and whether an official MCP exists).
2. Ask the agent for three approaches. Prefer an MCP for a quick start, API scripts for control and
   custom fields.
3. Provide the API token and any workspace, team or pipeline ids the agent asks for. Put them in `.env`.
4. Scope the agent to the right pipeline or space and have it store that knowledge in a directive so
   a fresh session knows it.
5. Have it learn the fields and statuses first ("go learn about the space").
6. Test create, read, update, delete on a throwaway record. Delete the test record.
7. Reference the CRM scripts from other directives (lead intake, onboarding, follow-up).

## Templates / prompts

```
I'd like you to be a wrapper around my CRM ([Follow Up Boss / KW Command /
ClickUp]). I want to ask you to do anything inside it and have you automate
it. This will let other AIRE workflows log to it. All records live in the
[Buyers and Sellers] pipeline. Give me three ways we could do this.
```

```
Build a series of CRM directives so I can add, update, read and tag
contacts via API calls. One script per operation in execution/, one
directive per operation in directives/, a crm_client.py base. Read the key
from .env as CRM_API_KEY. Test each script on a record named
"TEST DELETE ME" and clean it up.
```

Resulting layout:

```
directives/
  crm_create_contact.md
  crm_update_stage.md
  crm_add_note.md
  crm_find_contact.md
execution/
  crm_client.py
  crm_create_contact.py
  crm_update_stage.py
  crm_add_note.py
  crm_find_contact.py
```

## Pitfalls Nick calls out

- An MCP is general, so it does not know your space. Tell it and make it store that knowledge.
- Some MCPs cannot touch custom fields. Check before relying on one.
- A fresh instance has no memory of the last session. Scoping must live in a directive, not in chat.
- Leaving test records behind. Delete them.
- Committing to a stalled approach. Switch.

## How Caleb should use this

- Wrap Caleb's CRM so AIRE can log every lead touch: source, property of interest, stage changes,
  showing notes. Stage names should mirror Caleb's real pipeline (new lead, contacted, showing
  scheduled, under contract, closed).
- Chain it: website form lead creates a record, intake directive drafts a reply, open house sign-in
  sheet imports attendees, closing triggers a review request draft.
- Record updates are internal and low risk. Any outbound message triggered from a stage change still
  needs Caleb's approval before sending.
- Keep the CRM key in `.env` and never let the agent rotate it.
- Costs: CRM API use is usually included in the plan, but confirm rate limits before bulk imports.

## Verification

- "Create a test contact named TEST DELETE ME in stage new lead" produces a visible record with a
  link, then "delete it" removes it.
- Custom fields (price range, area, pre-approval) can be set and read back.
- A fresh session knows which pipeline to use without being told.
- Another directive (for example lead intake) successfully calls the CRM scripts end to end.
