# Kutuzov Studio — Commercial film

30 s / 16:9 / 1280×720 / 30 fps / H.264 + AAC. Portuguese copy, original synthesized soundtrack. Isolated motion production; no application code, Supabase, or deployment changes.

## Editorial timeline
- 00–03: A primeira impressão começa aqui.
- 03–07: Cards and badges, perspective and blue light trail.
- 07–11: Choose product and type identity into the animated editor.
- 11–15: Five design directions, front and back.
- 15–19: Personalization and palette changes.
- 19–23: PDF export and supported additional formats.
- 23–26: No account, no watermark, free.
- 26–30: Original EK monogram, Studio name and direct CTA.

## Provenance / boundaries
Based on index.html, src/portfolio-theme.css, src/templates.mjs and src/app.mjs. Exact EK SVG path; reconstructed advertising UI and illustrative cards matching the family labels and colors, not a recording or actual renderer export. Inter Display and DejaVu Sans Mono are local fallbacks for the site's Syne/Manrope/JetBrains Mono. No Magnific, generative imagery, third-party reference footage, or Adobe After Effects. No live product test implied.

## Renderer
The editable Python renderer and MP4 are supplied as separate download artifacts in the production handoff. Required: Python 3, Pillow, NumPy, OpenCV, CairoSVG, FFmpeg, local Inter Display and DejaVu Sans Mono fonts. Run `python render.py --output Kutuzov_Studio_Commercial.mp4`; `--preview --output storyboard.jpg` creates a contact sheet. Source SHA-256: `a6b445b36147f06a971af0b77b906313404555d148006ff324b1a99f1da65b66`. No binary deliverable is stored on this branch.
