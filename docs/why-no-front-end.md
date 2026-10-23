# Why the dispatch base has no front end

A dispatcher can import orders, review exceptions, plan a route and print a driver sheet through the coding agent. Read-only HTML shows the current record. There is no service to host for the local demo.

A screen gives a dispatcher a live map, drag-and-drop resequencing and quick mid-route changes. A mobile app gives drivers navigation, offline sync, photos and signatures. This base supplies none of those. It also supplies no geocoder, road-network routing engine, traffic feed, SMS or customer tracking link. Enterprise DNA scopes those integrations in the customer's version.

The planner uses a greedy earliest-due, tightest-window sequence with supplied directed travel times. It is not a shortest-route solver. It can leave an order unassigned even when a different sequence would fit. Re-plan after reviewing the rejected orders. Estimates must be verified within 30 days of the route date. They are not measured journey times. No map or coordinate calculation is passed off as road routing.

PGlite supports one process at a time. Use Postgres and authenticated operator access for a shared installation. Operator names are assertions, not verified identities. Database owners can change audit history. Protect files, restrict database roles and test encrypted backups before using real addresses.
