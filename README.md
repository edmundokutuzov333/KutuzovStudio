# Kutuzov Studio 0.3
Independent main-only repository. Static ES modules; zero runtime dependencies. Node 22, Python 3. `npm test`; `npm run dev`.

## Implemented scope
Local-first catalog, 60 combinations (12 design families × 5 layout strategies), five deterministic proposals, sector selection, remix, card & base badge formats, custom 25–200 mm, orientation, two faces, photos and logos with local decoding, framing, text fit, QR version 5-L, SVG export with bleed and warnings. All personal data stays in the browser. Fonts are generic system fonts, not embedded; SVG RGB is not PDF/X or certified print production. Phase 04 will implement print exports and physical proofs. Phase 05 will add complete badge workflows.

## Backend
Dedicated Supabase project remains blocked by the two active free project quota in organization moofpycioncpeefoohns. No migration applied. Catalog is read-only and optional; local fallback is explicit. Apply the versioned migration and permission tests only in a new dedicated Studio project; configure URL and publishable key in src/config.mjs. No PII is persisted server-side. No Edge Functions or triggers are needed for read-only catalog. Generated database types must be generated after provisioning; do not claim live verification. Magnific not used.

## Quality
Node tests cover geometry, templates, QR, escaping, layout and mocked catalog. CI executes tests and syntax checks. Browser and real print testing are separate gates. No portfolio changes.
