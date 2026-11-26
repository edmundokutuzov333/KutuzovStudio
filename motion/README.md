# Kutuzov Studio / Official Commercial
Separate production branch; no changes to main or the portfolio, no deployment. Final master and complete render kit delivered separately as MP4 and ZIP. This directory stores the production manifest, source-capture procedure and vector art generation code. The complete renderer, generated PNG/SVG assets, original WAV, storyboard and instructions are in the separately delivered Motion Project ZIP. No font binaries or user reference videos are stored in this repository.
## Reference direction
01: Stripe-style blue glow, precise product UI and hard cuts.
02: floating cards, perspective shifts, dark navy and violet light.
03: kinetic typography, white-space transitions and short brand CTA.
No reference footage or audio is reused.
## Recreate assets
npm run build
node motion/assets.mjs motion/assets
python motion/capture.py dist motion/assets
Rasterize each SVG using Inkscape --export-width=950. The exact delivered assets were captured from the certified build at 3c1a758483357f89a46598b26f4b32a1abc618f7; local browser used system font fallback. The source kit contains the actual captures. The motion typography uses Inter Display and DejaVu Mono, not original webfont files.
## Timeline
See manifest.json. 26.5 seconds, 1920x1080, 30fps. Original score, no Magnific, no generative video. The final deliverable is H.264/AAC; not an After Effects AEP. The SHA-256 in manifest identifies the exact delivered MP4. 
