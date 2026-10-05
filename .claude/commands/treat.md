# treat

Record treatment exactly as provided. Never invent doses or withholding periods. Missing instructions stay flagged.

Run `node scripts/herd.mjs add treatments --animal=<tag> --treated=YYYY-MM-DD --product="<name>" --batch=<batch> --product-expiry=YYYY-MM-DD --dose="<recorded dose>" --meat-clear=YYYY-MM-DD --export-clear=YYYY-MM-DD --instruction-ref="<label or veterinarian reference>" --operator="<name>"` with the operator values replacing placeholders. Run the matching read afterwards. Omit optional fields when unknown. Use `node scripts/herd.mjs help` for entity fields.
