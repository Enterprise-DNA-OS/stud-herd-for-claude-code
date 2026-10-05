# calve

Create the calf with /add first, then record calving. Calf birth and dam must agree. The matching joining becomes calved.

Run `node scripts/herd.mjs add calvings --dam=<tag> --calf=<tag> --calved=YYYY-MM-DD --joining=<id> --birth-kg=<kg>` with the operator values replacing placeholders. Run the matching read afterwards. Omit optional fields when unknown. Use `node scripts/herd.mjs help` for entity fields.
