# Stud Herd for Claude Code

## Operator context

Business: Your stud name. Operator: Your stock manager. Set the property codes, AU state or NZ location and breeding season before importing live data. Demo records are fictional.

## Working rules

Read before writing. Use the one CLI in scripts/herd.mjs and answer from current records. Never invent doses, withdrawal dates, breeding values, official receipts or parentage. Names can be ambiguous; list candidates and ask for the tag. All exports and drafts stay private. Never send, publish, delete or submit to an official registry. Back up before schema changes.

The embedded database uses one process at a time. DATA_DIR chooses the database; DATABASE_URL selects PostgreSQL. The demo always uses .data/demo. A normal CLI uses .data/db unless configured. Never seed a working database. Receipts record evidence of an official action taken elsewhere. Status changes and property changes are separate from movement evidence.

## Recurring work

| Ask | Recipe |
|---|---|
| add | /add |
| animal | /animal |
| attention | /attention |
| breeding review | /breeding-review |
| breeding values | /breeding-values |
| calve | /calve |
| calving watch | /calving-watch |
| compliance | /compliance |
| customise | /customise |
| documents | /documents |
| draft sale | /draft-sale |
| export | /export |
| growth | /growth |
| herd | /herd |
| import | /import |
| join | /join |
| log | /log |
| move | /move |
| movements | /movements |
| new view | /new-view |
| pedigree | /pedigree |
| performance review | /performance-review |
| properties | /properties |
| record gaps | /record-gaps |
| sale lot | /sale-lot |
| sale readiness | /sale-readiness |
| set | /set |
| treat | /treat |
| treatment holds | /treatment-holds |
| weekly review | /weekly-review |
| weigh | /weigh |

Run `node scripts/herd.mjs help` for exact fields. Keep one numbered migration per schema change. Validate it on disposable data with npm test. docs/compliance.md owns rule scope and source links. drafts/ holds unsent work. No medical recommendations or automatic breeding decisions. EBVs are recorded values from the named analysis, never calculated here.

Built by Enterprise DNA. Managed through Omni by Enterprise DNA: https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=herdmaster
