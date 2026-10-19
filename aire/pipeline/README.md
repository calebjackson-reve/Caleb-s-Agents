# Pipeline tracker

No pipeline sheet existed in Caleb's Drive on October 19, 2026, so this is the template. Two example rows, clearly marked, replace them with real deals.

## Columns
`client, side (buyer|seller|both), address, stage, price, commission_pct, expected_close, source, last_touch, next_step`

Stages, in order: lead, consult, active (listed or actively showing), showing, under_contract, closed, lost.

## Set up
Done October 19, 2026. The sheet exists: https://docs.google.com/spreadsheets/d/1sD1cw5JK_i_Q60Y31wy_RODCcVYOMJaTQ1eAF8CVBV4/edit
1. Delete the two example rows. Add every live deal.
3. Share nothing. The dashboard reads it through Caleb's own Google connector.

## What reads it
- `aire/dashboard/` shows the pipeline section once the sheet exists. Until then it shows a designed empty state pointing here.
- Claude Dashboards (beta, see STACK.md) can connect to the same sheet when Caleb turns it on. This template keeps the columns compatible.
- The weekly brief does not read it. Teardown Tuesday does not read it.
