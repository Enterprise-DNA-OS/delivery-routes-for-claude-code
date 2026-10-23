# One delivery CLI

All commands accept --json. Options use --name=value. Names match case-insensitively and unique UUID prefixes work. Ambiguous or missing matches list candidates and exit 1. No command sends messages.

| Command | Options |
|---|---|
| help | none |
| orders | none |
| drivers | none |
| vehicles | none |
| routes | none |
| travel | none |
| attention | none |
| unassigned | none |
| failures | none |
| history | none |
| activity | none |
| route-sheet | route |
| customer-review | none |
| driver-load | none |
| weekly-review | none |
| compliance | none |
| add-driver | name licence actor |
| add-vehicle | name capacity inspection actor |
| add-order | name address location due start end units service notes actor |
| confirm-order | order address start end units service actor |
| travel-add | origin destination minutes evidence checked actor |
| plan-route | name driver vehicle date depot start end actor |
| release-route | route actor |
| cancel-route | route actor |
| record-outcome | order outcome evidence actor |
| log-work | driver from to kind evidence actor |
| import optimoroute | file dry-run actor |
| export | file |
| draft-dispatch | route file |

Clock times are HH:MM and route dates are YYYY-MM-DD. Work timestamps are UTC YYYY-MM-DDTHH:MM:SSZ. Start and end on orders mean delivery windows. Start and end on plan-route mean shift boundaries. The planner counts service completion against the window end. Travel estimates are directed, take whole minutes and require a dated evidence reference. Capacity units must match between vehicles and orders.

A driver and vehicle can each have one active route per day. Draft routes can be cancelled to free their orders. Released routes retain their assignment and history. Outcomes require evidence and a released route on or before today. A failed order stays failed; create a separate retry order with the original ID in its notes. Review edits to master data through /customise until a dedicated correction workflow is added.

Export is a JSON interchange copy of all nine record sets, not a restore utility. Drafts and exports refuse to overwrite existing files. Back up the database separately.
