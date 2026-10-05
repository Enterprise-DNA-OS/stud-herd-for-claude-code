# move

Record movement evidence. Use an explicit timezone. This does not submit to NLIS or NAIT or change the animal property.

Run `node scripts/herd.mjs add movements --animal=<tag> --from-code=<code> --to-code=<code> --country=AU --moved-at=YYYY-MM-DDTHH:MM:SSZ --direction=incoming --document-ref=<reference>` with the operator values replacing placeholders. Run the matching read afterwards. Omit optional fields when unknown. Use `node scripts/herd.mjs help` for entity fields.
