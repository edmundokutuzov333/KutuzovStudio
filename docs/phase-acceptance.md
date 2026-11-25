# Phase 04 / 07 / 08 / 09 release gates

This document distinguishes implemented code from independent acceptance.
- 04: RGB PDF, SVG, PNG, JPG, duplex imposition, ZIP, local vector/ICC/PDF-X candidate workflow. CI tests plus printer proof using the actual paper, press and ICC; formal PDF/X validation is not replaced by the converter.
- 07: SQL permissions, live membership, MFA, editor workflow, draft/publication/audit. Real administrator must be invited, granted membership, and enrol TOTP. Browser mocks do not establish real-account acceptance.
- 08: original backgrounds, user-supplied licensed assets with editable/flattened export policy, private metadata curation. Magnific search requires approved commercial/API terms, explicit enablement, a secret and allowed admin origin. No public stock distribution or paid downloads are enabled. See magnific-curation.md.
- 09: responsive journey, accessible navigation, stale-preview protection, actual browser download tests and mocked editorial UI. CI uses Chromium, Firefox and WebKit, not physical iOS Safari certification.

Do not claim 100% acceptance while an external gate is open or a CI job is not successful on the exact main commit.
