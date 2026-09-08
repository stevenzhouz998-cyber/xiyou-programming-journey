# W4-M3 controlled visual evidence

Captured 2026-09-01 (02:16–02:18 UTC); independently reviewed and indexed 2026-09-08. These are existing real-browser full-page captures, not a claim that browsers were rerun on the review date. The default capture has the prior-level summary expanded; the proven capture follows the saved successful run and refresh.

Inspected all ten captures: the full elderly visitor remains intact without clipping, coloured fringe or an opaque rectangle; the waiting and proven route cells have no visible cross-cell bleed or seam; the two public cards, editor controls and safe epilogue remain readable. Widths 1440, 768, 390 and 320 retain all content without visible horizontal overflow or overlap. Narrow layouts require vertical scrolling. This static visual review does not establish keyboard, audio, recovery or restricted-runtime correctness; those are separate browser checks. Conflict-state semantics and animation also require the browser matrix, not these two static states.

The two shipping assets keep the hashes and provenance recorded in [the manifest](../assets/asset-manifest.md). No illustration was changed during this evidence review.

## Audit boundary

This text index is version-controlled. Screenshot binaries are local verification artifacts under `visual-results/` and are not required in a clean checkout. The asset gate validates the linked index, exact five-project/two-state coverage, paths, SHA-256 format and dimensions; it cannot prove pixels from absent binaries. Before reusing a local capture, compare its actual SHA-256 and PNG dimensions with the entry. New UI/asset changes require new captures and review, followed by updating this index. The source command below reproduces the relevant spec with the five projects configured in `playwright.config.ts`; timestamps and resulting screenshot hashes may change on a rerun.

```json
{
  "capturedAt": "2026-09-01",
  "reviewedAt": "2026-09-08",
  "command": "npx playwright test e2e/week-four-python-branch-structure.spec.ts",
  "entries": [
    {
      "project": "desktop-chromium-1440x1024",
      "state": "default",
      "path": "visual-results/week-four-python-branch-st-0c553-rt-parent-summary-and-W4-M4-desktop-chromium-1440x1024/w4m3-default-desktop-chromium-1440x1024.png",
      "sha256": "a5a0e955313b43d989990937e6db7eefb87895f541af6a8e06eeee4166512d2f",
      "width": 1440,
      "height": 1494
    },
    {
      "project": "desktop-chromium-1440x1024",
      "state": "proven",
      "path": "visual-results/week-four-python-branch-st-0c553-rt-parent-summary-and-W4-M4-desktop-chromium-1440x1024/w4m3-proven-desktop-chromium-1440x1024.png",
      "sha256": "e3597f075da43a933879c58b8cb7772d5fcdc7bda71cf2fb6ff35346781daba1",
      "width": 1440,
      "height": 1584
    },
    {
      "project": "desktop-firefox-1440x1024",
      "state": "default",
      "path": "visual-results/week-four-python-branch-st-0c553-rt-parent-summary-and-W4-M4-desktop-firefox-1440x1024/w4m3-default-desktop-firefox-1440x1024.png",
      "sha256": "7459fc7cfa1aedc15c6429cebfed8a92d03f17dc86b486f202104e3c8293acc9",
      "width": 1440,
      "height": 1509
    },
    {
      "project": "desktop-firefox-1440x1024",
      "state": "proven",
      "path": "visual-results/week-four-python-branch-st-0c553-rt-parent-summary-and-W4-M4-desktop-firefox-1440x1024/w4m3-proven-desktop-firefox-1440x1024.png",
      "sha256": "fad8645cee221da50b817b7b0be5eb21e0a0eb51a8f3935391c7a2f0a1c46298",
      "width": 1440,
      "height": 1601
    },
    {
      "project": "mobile-chromium-390x844",
      "state": "default",
      "path": "visual-results/week-four-python-branch-st-0c553-rt-parent-summary-and-W4-M4-mobile-chromium-390x844/w4m3-default-mobile-chromium-390x844.png",
      "sha256": "5741afe30a3c915481167e5a0350b98c4c8ae68c02119a93a3935884061b329a",
      "width": 390,
      "height": 3935
    },
    {
      "project": "mobile-chromium-390x844",
      "state": "proven",
      "path": "visual-results/week-four-python-branch-st-0c553-rt-parent-summary-and-W4-M4-mobile-chromium-390x844/w4m3-proven-mobile-chromium-390x844.png",
      "sha256": "dcca2a6288f439992453e81701b10b3aced3db958e34283905b4f3327371a570",
      "width": 390,
      "height": 3906
    },
    {
      "project": "narrow-chromium-320x844",
      "state": "default",
      "path": "visual-results/week-four-python-branch-st-0c553-rt-parent-summary-and-W4-M4-narrow-chromium-320x844/w4m3-default-narrow-chromium-320x844.png",
      "sha256": "6cea0e9ca7c052d429bda5e4313526f3f1c8c9bbb315f7b86abdba30f582e365",
      "width": 320,
      "height": 3890
    },
    {
      "project": "narrow-chromium-320x844",
      "state": "proven",
      "path": "visual-results/week-four-python-branch-st-0c553-rt-parent-summary-and-W4-M4-narrow-chromium-320x844/w4m3-proven-narrow-chromium-320x844.png",
      "sha256": "4af2362fb53d76f8c3691e651df703a10d12e917fa6e357ea241940398e3e426",
      "width": 320,
      "height": 3822
    },
    {
      "project": "tablet-webkit-768x1024",
      "state": "default",
      "path": "visual-results/week-four-python-branch-st-0c553-rt-parent-summary-and-W4-M4-tablet-webkit-768x1024/w4m3-default-tablet-webkit-768x1024.png",
      "sha256": "3ed5a6ca39d0e80c06c7edaec1527715c34172749d6345899e447974a68a9989",
      "width": 768,
      "height": 3246
    },
    {
      "project": "tablet-webkit-768x1024",
      "state": "proven",
      "path": "visual-results/week-four-python-branch-st-0c553-rt-parent-summary-and-W4-M4-tablet-webkit-768x1024/w4m3-proven-tablet-webkit-768x1024.png",
      "sha256": "f45fe91e0b343ff2713093a78fc387d9017d287134b492b6ef1252f2cfae0111",
      "width": 768,
      "height": 3166
    }
  ]
}
```
