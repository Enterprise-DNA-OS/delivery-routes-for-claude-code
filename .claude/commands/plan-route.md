# plan-route

Read the affected records first. Use the operator's supplied facts and actor name. Never invent missing values.

Run `npm run delivery -- plan-route --name=<name> --driver=<driver> --vehicle=<vehicle> --date=<date> --depot=<depot> --start=<start> --end=<end> --actor=<actor> --json`.

Use current supplied travel times and one consistent load unit. Report skipped orders and every reason. This is a greedy feasible plan, not a shortest route guarantee.

Never send messages, invent evidence or open live tracking services. Local file output may contain private addresses.
