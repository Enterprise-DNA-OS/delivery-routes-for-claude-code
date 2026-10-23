# Move your OptimoRoute delivery records

[OptimoRoute: Export routes to Excel](https://help.optimoroute.com/hc/en-us/articles/27630278304404-Export-routes-to-Excel), checked 23 October 2026, documents Plan and Optimize, Share Routes, Excel export, Raw data. Select the dates you need. The help page says the default is XLS and XLSX is available from support.

Open the Raw data worksheet in your spreadsheet application and save it as UTF-8 CSV. Do not use the printing or route-summary layout. Normalise Due date, Route date or Date to YYYY-MM-DD and Duration to whole minutes. These are explicit preparation steps, not a direct XLS importer.

```bash
npm run migrate
npm run delivery -- import optimoroute --file=imports/raw-data.csv --actor=dispatcher --dry-run
npm run delivery -- import optimoroute --file=imports/raw-data.csv --actor=dispatcher
```

Use a fresh DATA_DIR for real records and do not seed it. Import is one command once the worksheet is saved and normalised. The included CSV fixture is fictional and uses documented headings, not a downloaded customer export. Modified/custom export headings require a mapping change before import.

| Source heading | Destination |
|---|---|
| Order ID | Stable external key |
| Customer, falling back to Location Name | Customer name |
| Location ID, falling back to Location Name | Routing location key |
| Address when present, otherwise Location Name | Address pending dispatcher confirmation |
| Due date, falling back to Route date then Date | Due date |
| Duration | Service minutes, default 10 if empty |
| Every original column | Unmodified source history |

The vendor's raw-data list does not guarantee a street-address column. Location Name is a placeholder until a dispatcher confirms the actual address. Capacity Labels, Time windows, Scheduled at, Driver and Vehicle Label have configurable semantics. They remain in source history and do not silently become trusted planning inputs. Imported orders are blocked from planning until confirmed:

```bash
npm run delivery -- confirm-order --order="Customer name" --address="Verified delivery address" --start=09:00 --end=12:00 --units=4 --service=10 --actor=dispatcher
```

Use one consistent capacity unit for every vehicle and order, such as crates. Import does not infer completed deliveries from an old scheduled stop. Add driver, vehicle and directed travel-time records separately. History remains available through export. Photos, signatures, live positions, attachments, messages and integrations do not come across in this file. Keep their original archive.

Identical files skip existing orders. Changed source records fail rather than overwrite operational history. Duplicate source IDs, malformed CSV, missing fields and invalid dates fail the entire transaction. Dry runs write neither orders nor audit entries.

Reconcile CSV row counts and stable IDs against the import result, then inspect exceptions and confirm each active order. Test a real representative route beside the incumbent, including capacity, road access, delivery windows, return travel and the driver's logbook. Do not cancel the incumbent until the required live services and your acceptance checks are complete.
