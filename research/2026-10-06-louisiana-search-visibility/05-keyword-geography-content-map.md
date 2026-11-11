# Keyword, geography and content opportunity map

Files: `csv/keyword-library.csv` (65 queries and prompts), `csv/serp-benchmark.csv` (42 benchmarked queries with conditions), `csv/editorial-backlog-90d.csv` (15 items), `briefs/01..10`.

Demand numbers: none. No licensed keyword tool was available and nothing was estimated. Priority is a qualitative judgment from intent, observed competition, business value and available proof. Treat the "business_value" column as my assessment.

## Testing conditions for benchmarks
- Tool: Claude Code WebSearch (US index). Not Google. No local pack, no AI Overview visibility, no location setting, no device setting.
- Date: 2026-10-06, 10:45 to 12:30 CT.
- Recorded per query: owned domain present (always no), leading domains, named agents, notes.
- The Mac rerun should use Google in a fresh profile with location set to Zachary 70791, St. Francisville 70775, New Roads 70760 and Baton Rouge 70806, desktop and mobile, and should record organic, Maps pack and AI Overview/AI Mode separately.

## Clusters and principal intent per page (one intent per page)

| Cluster | Page that should own it | Status |
|---|---|---|
| Brand (K01-K04) | Home, About, GBP | About needs current brokerage; identity fixes |
| Seller Zachary (K05-K07) | `/sell-zachary` (proposed) | gap |
| Seller Baton Rouge north (K08, K12, K13) | `/sell-baton-rouge` (proposed) | gap |
| Net proceeds (K09-K11) | Seller Net Sheet page + explainer | tool unverified |
| Market (K14-K16) | Monthly market note pages per parish | unverified |
| Recommendation (K17-K25) | GBP + About + service-area pages | GBP incomplete |
| Inventory (K26-K28, K33, K34, K44-K47) | IDX area pages with unique intros | unverified |
| Water and land (K29-K32) | False River guide; Felicianas acreage guide | gap |
| Relocation (K35-K40) | Zachary relocation guide; BR relocation hub | gap |
| Neighborhood (K41-K43) | Existing neighborhood guides | review AI edits |
| Flood (K48-K52) | Flood-zone check + Zone X explainer | tool unverified |
| Ownership cost (K53-K57) | True Payment Calculator + worked example | tool unverified |
| Tools and quiz (K59-K60) | Quiz page | unverified |
| Luxury (K61-K62) | IDX filter pages; Bocage guide | low priority |
| Informational agent-choice (K63-K65) | Compare-agents guide | gap |

Cannibalization control: seller pages are city-specific (Zachary, Baton Rouge north) and the net sheet explainer is statewide; relocation guides are city-specific and the BR hub links to them; flood explainer is parish-level and the tool page stays generic.

## Staged geography

1. **Core now:** Zachary, north East Baton Rouge (Central, Greenwell Springs, Pride), East Feliciana (Jackson, Clinton, Slaughter). Reason: observed listing proof, thinnest competition, closest to the "Action Jackson" story.
2. **Adjacent next (days 30-60):** St. Francisville and West Feliciana, New Roads and False River (Pointe Coupee). Reason: recommendation queries are owned by local offices; organic informational gaps are open.
3. **Metro and state (day 60+ only if measured):** Baton Rouge south and Ascension (Prairieville, Gonzales), where the GBP pin sits but the competition is heaviest; then statewide informational pieces (net proceeds, buyer-broker agreement, agent comparison) that earn citations without implying local service everywhere.
4. **Deferred:** Orleans, Acadia, Livingston, West Baton Rouge. The assignment lists them as historically named parishes. No current service evidence was found. Do not build city-swapped pages for them.

Which larger Louisiana markets deserve research later: New Orleans metro only if relocation inquiries from there appear in CRM data; Lafayette no (Broussard-level incumbents and no proof of service).

## First 10 briefs
See `briefs/`. Each has: target intent, proposed URL/title/H1, reader's question, evidence-led answer outline, Caleb's distinct contribution, sources and update cadence, sections, FAQs, visuals, internal links, next action. Creative treatments beyond the outline were not developed; the assignment asks for that only after an idea is selected. The Instagram creative guide on the Mac was not read, so no video or social treatment is proposed here.

## Guardrails applied in briefs
- School content links to official district boundary tools and makes no quality claims.
- No "safe neighborhood" or protected-class language; comparisons use commute, taxes, flood designations, inventory and price facts with dates.
- Flood content cites FEMA Map Service Center and public records; it never says a property will or will not flood.
- Market claims cite GBRAR or parish data with period and sample size; small samples are flagged.
- No client stories or transaction examples are drafted; placeholders say "permissioned example needed".
- National mortgage rates are not used as parish evidence.
