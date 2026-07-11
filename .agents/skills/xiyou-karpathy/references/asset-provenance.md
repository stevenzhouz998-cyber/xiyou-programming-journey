# Asset Provenance Rules

## Allowed

- The environment's built-in image generation or image editing tools may produce shipping characters, divine beasts, scenes, equipment, magic items, effects, collectibles, and decoration.
- Existing approved sources are allowed only when their license and provenance can be verified.
- A reliable icon library may be used only for UI interface symbols; icons must not substitute for illustrations. Record the library name, package version, and icon name in **Tool or source**, and record its license in **License/provenance**.

## Forbidden For Shipping

Shipping assets must not use Flutter drawings, SwiftUI drawings, emoji, ASCII, CSS art, div art, placeholder boxes, handcrafted SVGs, code-generated canvases, stretched screenshots, or untracked assets.

CSS and Phaser may only position, animate, crop, tint, or transition approved assets. They must not fabricate final artwork.

## Manifest

| Asset ID | Purpose | Tool or source | Prompt or source reference | Dimensions | License/provenance | Screen slots | QA status |
| --- | --- | --- | --- | --- | --- | --- | --- |

Every shipping asset must have exactly one complete manifest row. **Asset ID** must be a stable build-resolvable file path, content hash, or resource key. **Screen slots** must trace to actual imports or references in the build. Release verification must compare the manifest against the built output and fail on missing, extra, or mismatched assets.

**QA status** accepts only `planned | generated | provenance-verified | visual-qa-passed | rejected`. `visual-qa-passed` requires provenance verification first, and release accepts only `visual-qa-passed` assets.

No unreplaced placeholder may remain before release. An asset with any missing field cannot pass visual QA or release.

Brainstorm placeholders are allowed only when clearly labeled **non-shipping exploration**.
