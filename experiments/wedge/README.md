# Wedge Experiment — semantic context vs pixels

Question: does semantic context produce measurably better code than pixels-without-intent,
enough to justify filling it in? Metric: **edits-to-ship** (manual edits until the code is
committable). The gap between the two variants is the value of context, as a number.

Method: one frozen design representation fed identically to two isolated runs. Only variable
= the `SEMANTIC CONTEXT` block. Variant A = baseline (no context). Variant B = with context.
Runs executed as isolated subagents (zero cross-contamination), output scored by typecheck +
manual reading.

## Results

| Round | Screen | edits-to-ship A → B | Where the delta concentrated |
|---|---|---|---|
| 1 | Selected Clients (static section) | ~5 → ~1 | route, server/client, dead links, shared-component extraction |
| 2 | Ablations of Round 1 (remove 1 field at a time) | — | most fields **redundant** (carried by purpose / design notes / defaults); only the **cross-section shared-primitive** hint was irreplaceable |
| 3 | Team admin screen (real API) | ~5 → ~1 | **API contract** — A hardcoded data + wired nothing; B fetched the exact shape, scaffolded endpoints, handled loading/error/empty |

## Conclusion → backlog reorder

- **High value, irreplaceable:** (1) API contract incl. request/response **shape**;
  (2) cross-screen / graph context ("this component recurs", "entry/error of a flow").
- **Low value, redundant:** `route`, static-vs-interactive label, single-component mapping —
  a good Figma import + sensible defaults already supply these.

## Product change shipped from this

`ApiEndpoint` (types/index.ts) gained optional `request` / `response` shape fields; the
prompt-builder emits them and instructs the model to wire to the contract exactly and handle
data states; the RightPanel API editor captures them. See git history around this folder.

## Files

- `figma-node.json` — distilled frozen Figma node (NUCLEO-CC, node 11:20).
- `section-selected-clients.json`, `section-team.json` — frozen per-screen design inputs.
- `prompt-A*.md` / `prompt-B*.md` — the exact frozen prompts (A = baseline, B = +context,
  `B-no*` = ablations).
- `context-B.draft.md` — drafted semantic context.
- `figma-node.raw*.json` — raw Figma REST/MCP pulls (provenance).
