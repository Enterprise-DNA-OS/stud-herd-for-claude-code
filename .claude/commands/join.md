# join

Record a joining and an operator-supplied expected date. Read both parents first.

Run `node scripts/herd.mjs add joinings --dam=<tag> --sire=<tag> --joined=YYYY-MM-DD --due=YYYY-MM-DD` with the operator values replacing placeholders. Run the matching read afterwards. Omit optional fields when unknown. Use `node scripts/herd.mjs help` for entity fields.
