# Kutuzov Studio 0.3
Independent main-only repository. Static ES modules; zero runtime dependencies. Node 22, Python 3. `npm test`; `npm run dev`.

## Implemented scope
Local-first catalog, 60 combinations (12 design families × 5 layout strategies), five deterministic proposals, sector selection, remix, card & base badge formats, custom 25–200 mm, orientation, two faces, photos and logos with local decoding, framing, text fit, QR version 5-L, SVG export with bleed and warnings. All personal data stays in the browser. Fonts are generic system fonts, not embedded; SVG RGB is not PDF/X or certified print production. Phase 04 will implement print exports and physical proofs. Phase 05 will add complete badge workflows.

## Backend
Dedicated Supabase project wuzikoyawmpkezhakpnm in DevKutuzov (Free, eu-central-1) is active. Migration 20261125150524_studio_catalog applied, RLS regression query passed, generated types versioned in src/database.types.ts. Local catalog matches all eight remote rows. The browser uses a publishable key only. No PII is persisted server-side. No Edge Functions or triggers are needed for read-only catalog. Magnific not used.

## Quality
Node tests cover geometry, templates, QR, escaping, layout and mocked catalog. CI executes tests and syntax checks. Browser and real print testing are separate gates. No portfolio changes.

Browser smoke is included in CI. Public remote configuration accepts only HTTPS *.supabase.co and sb_publishable keys. `src/catalog.types.d.ts` derives the public contract from the generated live database types.

CI includes an isolated PostgreSQL 17 service with anon/authenticated roles to apply migrations, test RLS and compare seed data against the local catalog. This is not a live Supabase API test. Editor includes visibility, typography scale/alignment and image framing controls.
