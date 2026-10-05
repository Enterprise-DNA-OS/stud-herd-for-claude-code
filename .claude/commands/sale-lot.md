# sale-lot

Add a sale lot, then run /sale-readiness.

Run `node scripts/herd.mjs add lots --animal=<tag> --sale="<sale>" --lot-no=<number> --sale-date=YYYY-MM-DD --notes="<notes>"` with the operator values replacing placeholders. Run the matching read afterwards. Omit optional fields when unknown. Use `node scripts/herd.mjs help` for entity fields.
