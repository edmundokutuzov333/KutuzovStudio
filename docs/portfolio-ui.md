# Portfolio UI provenance
Source repository: edmundokutuzov333/kutuzovportfolio333, commit 9e47b25073356bb88c68e64efe10e9fb0f8ab484 (read-only).
- src/styles.css: exact :root palette and radius, display/sans/mono font names, dark radial background, original liquid-glass CSS.
- src/routes/__root.tsx: exact Google Fonts stylesheet URL.
- src/components/logo-paths.ts and LogoMark.tsx: original monogram path converted to inline SVG with currentColor; favicon adapted from it.
- src/components/DirectionIcon.tsx: same directional SVG convention; native inline SVG instead of importing Lucide/React.
- src/components/Reveal.tsx and src/routes/contact.tsx: compact adaptation of editorial headings, bottom-border fields, glass chips.
Chosen strategy: native HTML/CSS adaptation of shared source rather than copying React/Router/Framer dependencies or iframe embedding. Existing engine, RLS, workspace, print and contracts retained. Direct PDF is the default, advanced production and personalisation are discoverable but collapsed. The example is preview-only, never downloadable or persistable. Fonts are requested from the portfolio's existing public Google Fonts provider and fall back offline; no font binaries copied. The separate deployment is not the final portfolio integration.
