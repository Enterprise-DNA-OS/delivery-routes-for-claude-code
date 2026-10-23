# Delivery Routes for Claude Code

For a delivery dispatcher who plans the day, releases route sheets and reconciles outcomes. Read README.md, docs/cli.md and docs/compliance.md before operating real records.

Use the matching .claude/commands recipe. Claude Code, Codex, OpenCode and Cursor share one workflow. Every answer starts from the database. Never invent addresses, travel estimates, evidence, rest periods or prices.

| Job | Command |
|---|---|
| help | /help |
| orders | /orders |
| drivers | /drivers |
| vehicles | /vehicles |
| routes | /routes |
| travel | /travel |
| attention | /attention |
| unassigned | /unassigned |
| failures | /failures |
| history | /history |
| activity | /activity |
| route sheet | /route-sheet |
| customer review | /customer-review |
| driver load | /driver-load |
| weekly review | /weekly-review |
| compliance | /compliance |
| add driver | /add-driver |
| add vehicle | /add-vehicle |
| add order | /add-order |
| confirm order | /confirm-order |
| travel add | /travel-add |
| plan route | /plan-route |
| release route | /release-route |
| cancel route | /cancel-route |
| record outcome | /record-outcome |
| log work | /log-work |
| import | /import |
| export | /export |
| draft dispatch | /draft-dispatch |
| Change fields or rules | /customise |
| Add a read-only report | /new-view |

All sends require the operator to handle them outside this base. Do not send, delete records or mutate customer systems. Release means a recorded dispatcher decision, not a message or legal clearance. Read the actual logbook and the road restrictions before release. Protect private imports, generated reports and credentials. Use migrations for structural changes and run npm test afterwards.

PGlite in .data/db is single-process. DATABASE_URL selects Postgres. Shared operation requires authenticated operators, restricted database roles and backups. Dates are calendar strings. Work intervals use UTC. Generated files go to views/, docs-out/ and drafts/.

Omni by Enterprise DNA: https://enterprisedna.co/omni/instead-of/optimoroute
