# Delivery Routes for Claude Code

Plan the day's deliveries, print a route sheet and find the orders that still need a dispatcher. Keep the dispatch record in a database you own.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT licensed. Run the fictional demo and import your dispatch records. | Your capacity units, service rules, paperwork and integrations. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=optimoroute&utm_medium=customise) | [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=optimoroute&utm_medium=managed) |

For delivery dispatchers at wholesalers, food distributors and local delivery businesses. Works with Claude Code, Codex, OpenCode or Cursor. The free base covers the dispatch register and offline route workflows. OptimoRoute also supplies road optimization, tracking and mobile services. Those are separate integration work in a customer's version. [Scope and research](docs/research.md).

## Quick start

Node 20 or later, Windows or Linux:

```bash
git clone https://github.com/Enterprise-DNA-OS/delivery-routes-for-claude-code.git
cd delivery-routes-for-claude-code
npm install
npm run demo
npm test
npm run delivery -- attention
npm run delivery -- help
```

The demo seeds fictional deliveries, expired eligibility records, an overdue order, a failed delivery and a work interval missing a qualifying break. Dates are relative to first seed. Repeat seeding preserves existing records.

PGlite runs locally in .data/db, one process at a time. Set DATABASE_URL for Postgres with verified remote TLS. For real records, use a fresh DATA_DIR or database and run only npm run migrate. Do not mix demonstration records with customer addresses.

## Five dispatch rituals

1. `/unassigned`: find orders that still need a route.
2. `/plan-route`: build a draft sequence using current, supplied travel times.
3. `/release-route`: review the sheet and record the dispatcher's release.
4. `/record-outcome`: reconcile delivery evidence and failures.
5. `/weekly-review`: combine unresolved deliveries, routes and work-time findings.

There are 29 CLI commands and 31 slash recipes. Every CLI command accepts --json. Names match case-insensitively; unique ID prefixes work. Ambiguous names list candidates and exit 1. [Full command guide](docs/cli.md).

For a demo route, use today's date in the example below:

```bash
npm run delivery -- plan-route --name="Morning run" --driver="Aria Chen" --vehicle="Van One" --date=2026-10-23 --depot=depot --start=08:00 --end=17:00 --actor=dispatcher
npm run delivery -- route-sheet --route="Morning run"
npm run view
npm run docs
```

## What planning proves

The planner tries earliest-due orders with the tightest windows first. Each candidate must fit the vehicle load, its delivery window, supplied travel estimates, planned breaks and the return to depot before shift end. It returns a reason for every eligible order it could not fit. Driver and vehicle eligibility must cover the route date. Allocations are transactional, with one route per driver and vehicle per day.

Travel times must be supplied for each directed leg, with evidence checked within 30 days of the route date. No road, traffic or coordinate service is called. This is a greedy feasible sequence, not a shortest-route guarantee. The route sheet includes a travel and rest plan. Waiting counts as work. Proposed rest locations still need dispatcher approval.

A draft can be cancelled to free its orders. Changing an order, eligibility record or travel estimate invalidates a draft's release check. Delivered or failed outcomes require evidence and an already released route. Outcomes cannot silently overwrite one another. Failed orders remain in history; create a separate retry order and reference the original in its notes.

Release is an operator assertion, not a legal clearance or a message to a driver. Reconcile actual work and rest history, other employment, vehicle restrictions and suitable stopping places before departure. [Work-time checks and their limits](docs/compliance.md).

## Ten questions answered today

These are questions the build answers, not a claim that OptimoRoute cannot answer them.

| Question | Command |
|---|---|
| Which deliveries are overdue? | attention |
| Which orders still have no route? | unassigned |
| Which failed deliveries need a retry decision? | failures |
| Who has the most planned work across our recorded routes? | driver-load |
| Which customers have overdue or failed orders? | customer-review |
| Which licences or inspections have expired? | attention |
| What is the stop order and planned service time? | route-sheet |
| Which work intervals cross a recorded work-time threshold? | compliance |
| What evidence supports a delivery result? | history |
| Who recorded a plan, release or outcome? | activity |

## Your first hour: ten things to ask for

1. Put our business name, colours and logo on the route sheet.
2. Show deliveries that have passed their due date.
3. Find the orders still waiting for a route.
4. Review the failed deliveries with their reasons.
5. Test our raw-data export before importing it.
6. Confirm the address, load and service window for an imported order.
7. Record a verified travel time to a regular customer.
8. Draft a dispatch briefing in drafts/ without sending it.
9. Add a chilled-load field through `/customise`.
10. Add a weekly depot report through `/new-view`.

## Bring your OptimoRoute records across

Export the Raw data worksheet, save it as UTF-8 CSV, and normalise dates and durations as described in the [replacement guide](docs/replace-optimoroute.md).

```bash
npm run delivery -- import optimoroute --file=imports/raw-data.csv --actor=dispatcher --dry-run
npm run delivery -- import optimoroute --file=imports/raw-data.csv --actor=dispatcher
```

Stable Order IDs prevent duplicates. Every original column survives in source history. Invalid files roll back completely. Changed source records require reconciliation rather than overwriting local work. Imported orders stay blocked from planning until their address, capacity and delivery window are confirmed. The fixture is fictional and uses documented headings.

## Paperwork, views and privacy

npm run docs writes branded driver route sheets and per-driver exception/work reports. npm run view writes the read-only weekly dispatch desk. Change brand.json for business name, logo and colours. Print the HTML to PDF if needed. No app or web server is included. [What a front end would add](docs/why-no-front-end.md).

The draft command writes a local briefing and never sends it. Exports preserve all nine record sets as JSON and refuse to overwrite an existing file. This is an interchange copy, not a restore tool. Back up the database and original evidence separately and practise restoration.

Shared operation needs authenticated users, restricted database permissions and protected backups. Actor names are not authenticated identities. Database owners can alter the audit record. Keep real addresses, credentials, imports and generated documents out of Git.

## Verification

npm test uses a temporary database, exercises all 29 commands and checks duplicate allocation, changed-plan rejection, eligibility, break planning, capacity, shift limits, source preservation, repeat import, full rollback, exports, drafts and HTML output. The same suite supports a fresh disposable TEST_DATABASE_URL. The repository workflow covers Windows, Linux and Postgres. [Recorded verification](docs/verification.md).

MIT licence. Not affiliated with OptimoRoute or Anthropic. Hosting, coding-agent subscriptions and live routing services have their own costs. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=optimoroute&utm_medium=readme).
