# Kutuzov Studio 0.4.2
Independent main-only repository. Static ES modules; zero runtime dependencies. Node 22, Python 3. `npm test`; `npm run dev`.

## Implemented scope
Local-first catalog, 60 combinations (12 design families × 5 layout strategies), five deterministic proposals, sector selection, remix, card & base badge formats, custom 25–200 mm, orientation, two faces, photos and logos with local decoding, framing, text fit, QR version 5-L, SVG export with bleed and warnings. All personal data stays in the browser. Fonts are generic system fonts, not embedded; SVG RGB is not PDF/X or certified print production. Phase 04 implements direct raster PDF/PNG and native vector printing; physical proofs remain required. Phase 05 will add complete badge workflows.

## Backend
Dedicated Supabase project wuzikoyawmpkezhakpnm in DevKutuzov (Free, eu-central-1) is active. Migration 20261125150524_studio_catalog applied, RLS regression query passed, generated types versioned in src/database.types.ts. Local catalog matches all eight remote rows. The browser uses a publishable key only. No PII is persisted server-side. No Edge Functions or triggers are needed for read-only catalog. Magnific not used.

## Quality
Node tests cover geometry, templates, QR, escaping, layout and mocked catalog. CI executes tests and syntax checks. Browser and real print testing are separate gates. No portfolio changes.

Browser smoke is included in CI. Public remote configuration accepts only HTTPS *.supabase.co and sb_publishable keys. `src/catalog.types.d.ts` derives the public contract from the generated live database types.

CI includes an isolated PostgreSQL 17 service with anon/authenticated roles to apply migrations, test RLS and compare seed data against the local catalog. This is not a live Supabase API test. Editor includes visibility, typography scale/alignment and image framing controls.

## Production engine (0.4)
Local lossless RGB raster PDF (Flate-compressed), individual two-page PDF with exact MediaBox/TrimBox/BleedBox, optional vector crop marks, A4 duplex imposition with mirrored placement (long edge), PNG front/back at 300/600 DPI with pHYs metadata. Memory cap 12 megapixels per face. No fonts embedded because text is rasterized; no PDF/X, ICC or CMYK claims. Confirm printer requirements and proof physical output. SVG remains available as the vector exchange format. No new remote services.

## Release hardening (0.4.1)
Export revision tokens prevent stale asynchronous downloads, pending image decoding blocks export, and quality warnings require acknowledgment. Native browser printing uses the same SVG document and physical page geometry; browser PDF font embedding, trim/bleed boxes and colour management are not guaranteed by this option. Direct PDF remains lossless RGB with explicit trim/bleed boxes. PDF/X, validated ICC CMYK and physical proofs are not certified. Catalog decoder accepts PostgreSQL decimal strings and rejects redirects/credentials. Live schema generated types match checked-in types; no backend schema change necessary.

Nested SVG viewports are expressed in the outer millimetre-coordinate user units (not nested CSS mm); native printing waits for embedded images and font readiness. Stale print requests are cancelled before invoking the browser dialog.

## Additional print formats (0.4.2)
A3 and A4 duplex sheet imposition, JPG with JFIF DPI metadata, portable ZIP containing PDF/PNG/SVG and printer instructions, and DPI-specific preflight warnings. Native vector print fixture is checked in CI with Chromium and Poppler. The direct PDF is RGB raster; native browser PDF has browser-dependent page rounding and lacks explicit trim/bleed metadata. No PDF/X or CMYK certification.
