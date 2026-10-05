# Stud Herd for Claude Code

Cattle, pedigrees, joinings, calvings, weights, treatments, movement evidence and sale lots in a database you own. Built by Enterprise DNA. MIT licence. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Clone, install and own it. Free, MIT. | Your fields, breeding rules, HerdMASTER mapping, screens or a different stack. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |
| [Quick start](#quick-start) | [Discuss your version](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=herdmaster&utm_medium=readme-custom) | [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=herdmaster&utm_medium=readme-managed) |

## Scope and price

ABRI lists HerdMASTER 5 at A$950 a year excluding GST for stud and commercial properties, with all functionality and Central Sync included. This is a modest annual bill. Ownership and customisation are the reasons to consider this build. [Vendor pricing](https://www.abri.com.au/herdmaster-price), checked 2026-10-05.

The free base records farm work and prepares documents. It does not connect scales, scan tags, submit to NLIS or NAIT, calculate genetic evaluations, manage semen or embryo inventory, or produce accepted BREEDPLAN submission files. Existing official accounts remain necessary. Stored EBVs retain their trait, accuracy, analysis and run date; comparisons across different analyses are not supported.

## Quick start

Node 20 or newer:

```bash
git clone https://github.com/Enterprise-DNA-OS/stud-herd-for-claude-code.git
cd stud-herd-for-claude-code
npm install
npm test
npm run demo
```

Demo uses fictional data in .data/demo and refuses DATABASE_URL. Set DATA_DIR=.data/demo in your shell to query that demo afterwards. For a separate working database leave DATA_DIR unset, run npm run migrate, add your properties and import your records. Never put real exports in git. Copy your own business name, logo path and colours into brand.json.

```bash
node scripts/herd.mjs help
node scripts/herd.mjs herd --json
node scripts/herd.mjs animal IB-C01
node scripts/herd.mjs add properties --code=YOUR-PIC --name="Your Stud" --country=AU --region=NSW
node scripts/herd.mjs import herdmaster --properties=examples/herdmaster/properties.csv --animals=examples/herdmaster/animals.csv --dry-run
```

The example import files are synthetic. Run the dry run first on a fresh database. Import is a single transaction and requires exact animal tags or exact record names. Interactive commands also accept case-insensitive names and partial ids, listing candidates and exiting 1 when ambiguous. Dates are YYYY-MM-DD. Movement times require an explicit timezone. Local records never count as official submissions.

## Commands

| Command | Job |
|---|---|
| /add | Add an animal after checking that its tag is new. |
| /animal | Read one animal and all its history. |
| /attention | Find stale weights, late calvings and missing evidence. |
| /breeding-review | Review joining outcomes by sire. |
| /breeding-values | Review stored breeding values by analysis and run. |
| /calve | Create the calf with /add first, then record calving. Calf birth and dam must agree. The matching joining becomes calved. |
| /calving-watch | Plan the calving paddock checks. |
| /compliance | Check identification, receipt and treatment evidence. |
| /customise | Customise |
| /documents | Documents |
| /draft-sale | Read the animal and sale-readiness first. Draft to drafts/ for review. Never send or publish. |
| /export | Export every business entity to a private JSON snapshot. Keep database backups too; this is not a tested restore command. |
| /growth | Review latest weights and daily gains. |
| /herd | Review every animal and its mob. |
| /import | Import |
| /join | Record a joining and an operator-supplied expected date. Read both parents first. |
| /log | Read the animal history and record the operator note verbatim. |
| /move | Record movement evidence. Use an explicit timezone. This does not submit to NLIS or NAIT or change the animal property. |
| /movements | Reconcile movement receipts. |
| /new-view | New view |
| /pedigree | Check recorded sire and dam links. |
| /performance-review | Compare mob averages with their stale-record counts. |
| /properties | Review property codes and jurisdictions. |
| /record-gaps | Check society, parent and performance records. |
| /sale-lot | Add a sale lot, then run /sale-readiness. |
| /sale-readiness | Prepare sale lots and review holds. |
| /set | Read first. Confirm the requested field, then update it. NULL clears an optional field. Identifiers remain stable. See help for fields. |
| /treat | Record treatment exactly as provided. Never invent doses or withholding periods. Missing instructions stay flagged. |
| /treatment-holds | Review treatment instructions and clearance dates. |
| /weekly-review | Weekly review |
| /weigh | Record a yard weight. One weight per animal per day. |

## Ten questions to ask of your records

Each is answered by a shipped command. HerdMASTER also offers custom reports; these examples are not proof that its reporting cannot answer them.

1. Which cows are overdue to calve, and which sire was used? (`calving-watch`)
2. Which sale lots still have treatment reviews and missing movement receipts? (`sale-readiness`)
3. Which yearlings have the lowest recorded daily weight gain? (`growth`)
4. Which mobs have stale weights mixed into their latest averages? (`performance-review`)
5. Which sires have joinings with pregnancy results still pending? (`breeding-review`)
6. Which active cattle have missing parent or society records? (`record-gaps`)
7. Which animal movements lack a receipt after the reminder date? (`movements`)
8. Which treatments lack a batch, expiry or clearance instructions? (`compliance`)
9. Which breeding values belong to different analysis runs? (`breeding-values`)
10. What notes, weights, treatments and movements sit behind one animal? (`animal IB-C01`)

## Your first hour: ten things to ask for

1. Show cows due or overdue to calve.
2. Find cattle that have not been weighed recently.
3. Compare the yearlings with two recorded weights.
4. Check treatment instructions before the sale.
5. List missing official movement receipts.
6. Read the full history of one cow.
7. Draft the spring sale catalogue.
8. Change the name and colours in brand.json.
9. Add a paddock field with /customise.
10. Add a private weaner growth view with /new-view.

## Documents and views

npm run docs renders four types: a sale catalogue per lot, treatment records, movement preparation checklists and calving books. npm run view renders the stud week and performance snapshots. Files go to docs-out/ and views/. These are private, read-only HTML exports. They have no editing controls or server. Print them from a browser after review. The movement checklist is not an NVD or ASD.

## Import and ownership

[Switching from HerdMASTER](docs/replace-herdmaster.md) documents worksheet export, header mapping, dates and exclusions. The import accepts properties and animal CSVs, then weights, joinings, calvings, treatments, movements, EBVs and sale lots. It validates all supplied files before committing. Stable event keys prevent duplicate history on repeat imports. Absent fields preserve existing values. No automatic restore tool is provided. Keep normal database backups and test recovery.

`node scripts/herd.mjs export --out=exports/herd.json` writes every business entity, including notes. This is a portable snapshot, not an official submission format.

## Rules and limits

[Compliance record checks](docs/compliance.md) cite primary NZ and AU sources. They flag evidence for review, not legal compliance or fitness for slaughter. Treatment clearance dates come from product instructions supplied by the operator. No dose or interval is recommended. A lot with no flagged record can still have missing history or a destination requirement.

[Why no front end](docs/why-no-front-end.md) explains yard, phone and offline limits. PGlite supports one process at a time. PostgreSQL supports a shared installation through DATABASE_URL. The free base has no login, role system, encrypted backups or audit history. Restrict access and establish these controls before loading business records.

## Validation

npm test uses disposable storage, seeds twice, exercises every CLI read and write path, checks import rollback and repeat imports, date and name validation, calving links, traceability reminders, complete exports, drafts and HTML escaping. The workflow tests Windows and Linux with PGlite and Linux with PostgreSQL. A local Linux run does not prove Windows or hosted PostgreSQL until those jobs pass.

HerdMASTER is ABRI's product. This independent project is not affiliated with ABRI, BREEDPLAN, NLIS or NAIT.
