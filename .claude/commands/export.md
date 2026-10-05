# export

Export every business entity to a private JSON snapshot. Keep database backups too; this is not a tested restore command.

Run `node scripts/herd.mjs export --out=exports/herd.json` with the operator values replacing placeholders. Run the matching read afterwards. Omit optional fields when unknown. Use `node scripts/herd.mjs help` for entity fields.
