# Kutuzov Studio — Foundation

Independent repository; main only. Local-first static ES modules, no npm runtime dependencies or paid API. Run `npm test` and `npm run dev` (Python 3 static server at http://localhost:8000). No PII sent remotely. Phase 01 offers five single-sided vector layouts for eight formats, exact millimetre dimensions, SVG export with bleed and fallback catalog. It is not a print-certified PDF/X export, photo editor, or final launch.

## Backend contract
Supabase project provisioning in organization moofpycioncpeefoohns was blocked by the two-active-free-project quota. The migration in supabase/migrations is authored but NOT applied. After provisioning a dedicated project, apply the migration, run SQL permission tests, set the project URL and publishable key in src/config.mjs, and test the live REST endpoint. Never commit service role credentials. The anonymous role can only read published catalog columns; no visitor data is stored. The app uses an explicit local status if unconfigured, and a fallback status if the backend fails. No other project should be reused.

## Roadmap
1. Foundation: local rendering, catalog contract, CI.
2. Design engine: measured text layout, fonts with licenses, photos, logo, five genuinely distinct variants per brief, two-sided products.
3. Print engine: PDF trim/bleed boxes, font embedding, raster resolution checks, PNG/SVG/PDF, test physical proofs; PDF/X and CMYK only with validated ICC workflow.
4. Badge editor and batch CSV; privacy-first.
5. IndexedDB projects and brand kits, import/export, accessibility and mobile tests.
6. Editorial catalog and licensed asset sources; Magnific disabled until licensing and cost are verified.
7. Deployment, performance, security and production E2E; then integrate into portfolio only with explicit authorization.
