# Import HerdMASTER

Read docs/replace-herdmaster.md and the CSV headers. Do not guess a date convention, property, parent or animal match. Run `node scripts/herd.mjs import herdmaster --properties=<properties.csv> --animals=<animals.csv> --dry-run` with other history files as available. For custom headers use --map; for day-first dates explicitly use --date-format=dmy. Every event file needs stable external_id values.

After a clean dry run and the operator request to import, rerun without --dry-run. Compare animal counts, weights, pedigrees and a full history against HerdMASTER. An .sbb backup is not a CSV export. Never submit to official systems from here.
