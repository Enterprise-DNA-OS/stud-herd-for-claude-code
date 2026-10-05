# Bring HerdMASTER records across

ABRI documents worksheet exports to CSV in its [HerdMASTER FAQ](https://abri-support.atlassian.net/wiki/spaces/HSUP/pages/2643296258), checked 2026-10-05. Open the worksheet, choose its export action and select CSV. Include stable animal identifiers and the fields you want to retain. Export each history worksheet separately. Keep an original database backup as well. The importer does not read an .sbb backup, Excel workbook or PDF.

ABRI allows customised worksheets and publishes no single fixed CSV header contract in that guide. The files in examples/herdmaster/ are synthetic mapping examples, not claimed exports from an installed HerdMASTER system. Match the headers before running.

## One import command

On a new working database, run npm run migrate. Create a properties CSV with code, name, country (AU or NZ) and region. Animal rows need tag, name, sex, born and property. Use F, M or S for sex. The example aliases accept Visual ID, Animal Name, Sex, Date of Birth, Property and Electronic ID. Property references must match a property code or exact unique name. Animal references in event files must match a tag or exact unique name.

```bash
node scripts/herd.mjs import herdmaster --properties=imports/properties.csv --animals=imports/animals.csv --weights=imports/weights.csv --joinings=imports/joinings.csv --calvings=imports/calvings.csv --treatments=imports/treatments.csv --movements=imports/movements.csv --ebvs=imports/ebvs.csv --lots=imports/lots.csv --dry-run
```

Omit any file you do not have. After a clean dry run, run the same command without --dry-run. Files run in dependency order inside one transaction. A bad row rolls back the entire batch. Dry runs exercise the same writes and then roll back. No data leaves this process.

## Mapping and dates

`node scripts/herd.mjs help` lists accepted fields for every entity. Use --map=imports/map.json for custom headers:

```json
{
  "animals": {"tag":"Our animal code","name":"Registered name","born":"Birth date","property":"PIC"},
  "weights": {"external_id":"Weight record key","animal":"Our animal code","weighed":"Measurement date","kg":"Liveweight"}
}
```

The map goes from the destination field to the source column. The defaults also accept canonical field names with spaces instead of underscores. Unmapped columns are not imported; compare your export header list to the field list before proceeding. Blank optional fields are omitted and preserve existing values on a repeated import. To deliberately clear an optional value later, use set with NULL.

Use YYYY-MM-DD dates. If your export is day/month/year, explicitly pass --date-format=dmy. Ambiguous slash dates are rejected otherwise. Movement timestamps require an ISO time with Z or a numeric timezone offset; convert local timestamps using the farm's actual timezone before import.

Every history file requires an external_id, unique within that entity. Retain the source record key where available. If the report has none, create and retain a stable mapping key based on the original records before import. Never number rows afresh on every export. Duplicate keys in a file are rejected. Reimports update supplied fields at the same key and do not delete records missing from the new file.

## What maps

| File | Records |
|---|---|
| properties | Property codes, name, AU/NZ country and region |
| animals | Tags, electronic ID, birth, sex, breed, mob, property, sire/dam tags, society ID, tag/registration dates, status |
| weights | Animal, date, kilograms and management group |
| joinings | Dam, sire, dates, method and pregnancy result |
| calvings | Dam, calf, joining, birth date, assistance and birth weight |
| treatments | Product, batch, product expiry, dose, clearance dates, instructions and operator |
| movements | Property codes, direction, time, country, document and receipt evidence |
| ebvs | Recorded trait value, accuracy, run date and analysis |
| lots | Sale, lot number, animal, sale date and notes |

## Before switching daily work

Compare total animals by status, two pedigrees, two weight histories, current joining outcomes, every treatment hold and pending movement against HerdMASTER. Review the oldest and newest record dates. Generate a sale catalogue and check all breeding values against their original analysis. Keep both systems available until the owner accepts the reconciliation.

This base does not bring across layouts, attachments, scans, semen or embryo inventory, genetic calculations, hardware connections, online sync or official service credentials. It does not promise a BREEDPLAN-ready submission file. Enterprise DNA can scope the farm's mappings, additional history and integrations separately. Official NLIS, NAIT and breed society work stays in the existing services until a tested connection is commissioned.

HerdMASTER already supports custom reports and integrations. This project offers editable records and workflows under your ownership; it does not claim to replace every vendor feature automatically.
