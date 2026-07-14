# Asset manifest

This manifest gates the formal Dragon Palace media in `public/assets/dragon-palace`. Task 7 verifies generation provenance, real file hashes, dimensions, and media budgets. The assets remain `provenance-verified` until Task 10 supplies real-browser screenshots at 320, 390, 768, and 1440 pixels and explicitly promotes approved rows to `visual-qa-passed`.

| Asset ID | SHA-256 | Purpose | Tool or source | Prompt or source reference | Dimensions | License/provenance | Screen slots | QA status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| assets/dragon-palace/background.webp | 5e29946f3caf955a1657422024a672b4b92099b5913851c23fee889862de6196 | Layered Dragon Palace trial hall and readable three-zone battle floor | OpenAI built-in image_gen | [Prompt DP-001](#prompt-dp-001-background) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w1-m1 Phaser battle scene background | provenance-verified |
| assets/dragon-palace/wukong.webp | edfb3ceabf92988cbe4c0d6a72de390bf96313de4247b7dbf098ef749640df70 | Young Wukong player actor cutout | OpenAI built-in image_gen | [Prompt DP-002](#prompt-dp-002-wukong) | 640x640 | generated in-project with built-in image_gen; provenance verified | w1-m1 left hero actor and instruction-event states | provenance-verified |
| assets/dragon-palace/dragon-king.webp | 8274c4d0660f39cd10fe3924b83b0b2260aa0dd712570ddd8e2ebaa40bd8c942 | Friendly-authority Dragon King actor cutout | OpenAI built-in image_gen | [Prompt DP-003](#prompt-dp-003-dragon-king) | 640x640 | generated in-project with built-in image_gen; provenance verified | w1-m1 right-side guide and trial authority actor | provenance-verified |
| assets/dragon-palace/weapons.webp | 9845120ae72058d11c961e4e4de215f1a07e770f507359c931860d7045bc9528 | Three separated trial weapons: spear, halberd, and heavy staff | OpenAI built-in image_gen | [Prompt DP-004](#prompt-dp-004-weapons) | 1024x512 | generated in-project with built-in image_gen; provenance verified | w1-m1 center weapon states, equal horizontal thirds | provenance-verified |
| assets/dragon-palace/effects.webp | 114579b09a971b62f23e679bcb4bc4e562f9e6da1b7c8ba391253f997de6b8fe | Three separated feedback clusters: accepted, blocked, and success | OpenAI built-in image_gen | [Prompt DP-005](#prompt-dp-005-effects) | 1024x512 | generated in-project with built-in image_gen; provenance verified | w1-m1 instruction accepted, instruction rejected, and mission success feedback | provenance-verified |

## Prompt records

All five source illustrations were generated through separate calls to the environment's built-in `image_gen` tool. Generation sources remain outside `public` and outside this repository. The four keyed sources were processed with the official imagegen Skill helper `remove_chroma_key.py` using border auto-key sampling, soft matte, thresholds 12/220, and despill. Pillow then performed only technical crop-to-content, resize, transparent-canvas placement, and WebP encoding; no artwork was redrawn.

### Prompt DP-001 background

```text
Use case: stylized-concept
Asset type: Dragon Palace battle game environment background, final raster illustration
Primary request: a layered Dragon Palace trial hall for a children's coding battle game, designed for an exact 1600x900 final crop
Scene/backdrop: underwater royal trial hall with layered jade architecture, coral ornament, warm lantern light, restrained ocean atmosphere, and a broad readable gameplay floor
Subject: an empty trial hall with a clearly open left hero zone, a clearly open center weapon-testing zone, and a clearly open right Dragon King zone
Style/medium: commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.
Composition/framing: 16:9 wide establishing view, safe cropping, strong foreground-midground-background separation, level horizon and uncluttered gameplay floor
Lighting/mood: welcoming, adventurous, dignified, child-friendly, high readability
Constraints: no characters, no people, no creatures, no weapons, no magical effects, no labels, no signage, no watermark; keep all three gameplay zones clear and usable
```

### Prompt DP-002 Wukong

```text
Use case: stylized-concept
Asset type: transparent game character cutout, final raster illustration
Primary request: a young Wukong hero for a children's coding battle game
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for local background removal
Subject: one child-friendly young Monkey King, full body, friendly determined expression, age-appropriate compact proportions, warm brown monkey features, short dark-gold fur, red-and-jade travel tunic with restrained gold trim, soft boots and a simple small headband; empty hands, no weapon
Style/medium: commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.
Composition/framing: centered full body from head to feet, neutral ready stance, complete limbs and hands, generous even padding, opaque crisp silhouette
Lighting/mood: friendly, brave, curious, child-safe
Constraints: the background must be one uniform #ff00ff color with no shadows, gradients, texture, reflections, floor plane, or lighting variation; no cast shadow, no contact shadow, no reflection; do not use magenta or #ff00ff anywhere in the subject; no extra character, no detached objects, no watermark, no text
```

### Prompt DP-003 Dragon King

```text
Use case: stylized-concept
Asset type: transparent game character cutout, final raster illustration
Primary request: a Dragon King character for a children's coding battle game
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for local background removal
Subject: one full-body East Sea Dragon King with friendly authority rather than menace, mature kind face, neatly flowing dark teal beard, small elegant dragon horns, jade-and-cinnabar royal robe with restrained gold scale motifs, ceremonial crown, open empty hands, dignified welcoming stance
Style/medium: commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.
Composition/framing: centered full body from crown to shoes, complete limbs and hands, generous even padding, opaque crisp silhouette, visually distinct from Wukong
Lighting/mood: wise, calm, encouraging, child-safe, never threatening
Constraints: the background must be one uniform #ff00ff color with no shadows, gradients, texture, reflections, floor plane, or lighting variation; no cast shadow, no contact shadow, no reflection; do not use magenta or #ff00ff anywhere in the subject; no weapon, no extra character, no detached objects, no watermark, no text
```

### Prompt DP-004 weapons

```text
Use case: stylized-concept
Asset type: transparent three-cell game weapon sprite sheet, final raster illustration
Primary request: one horizontal sheet containing exactly three trial weapons: a slender spear, a crescent-blade halberd, and a thick heavy staff
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for local background removal
Subject: left third contains one complete upright spear; center third contains one complete upright Chinese halberd with one readable crescent blade; right third contains one complete upright thick heavy staff with broad gold-capped ends
Style/medium: commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.
Composition/framing: exact 2:1 horizontal composition intended for 1024x512; three equal imaginary cells, one weapon centered inside each third, equal visual scale, generous space between cells, every weapon fully visible from tip to end, no overlap and no merging
Lighting/mood: polished collectible game art, crisp and child-friendly
Constraints: the background must be one uniform #ff00ff color with no shadows, gradients, texture, reflections, floor plane, or lighting variation; no cast shadow, no contact shadow, no reflection; do not use magenta or #ff00ff anywhere in any weapon; exactly three weapons only; no hands, no characters, no dividers, no boxes, no cell borders, no detached pieces, no magical effects, no watermark, no text
```

### Prompt DP-005 effects

```text
Use case: stylized-concept
Asset type: transparent three-cell game feedback effect sprite sheet, final raster illustration
Primary request: one horizontal sheet containing exactly three distinct opaque stylized feedback effect clusters for accepted instruction, blocked instruction, and successful completion
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for local background removal
Subject: left third has an accepted-action cluster made of compact jade-gold forward energy strokes and small sparks; center third has a blocked-action cluster made of compact cinnabar-jade crossed impact waves with a firm central burst; right third has a success cluster made of a radiant gold-jade upward burst with celebratory cloud-like energy curls and sparks
Style/medium: commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.
Composition/framing: exact 2:1 horizontal composition intended for 1024x512; three equal imaginary cells, one centered effect cluster per third, equal scale, generous separation, complete cutout shapes, no overlap and no merging
Lighting/mood: responsive, encouraging, energetic, child-safe
Constraints: effects must be predominantly opaque crisp cutout shapes, not translucent smoke or mist; the background must be one uniform #ff00ff color with no shadows, gradients, texture, reflections, floor plane, or lighting variation; do not use magenta or #ff00ff anywhere in the effects; exactly three clusters only; no characters, no weapons, no words, no letters, no numbers, no checkmarks, no crosses as UI icons, no badges, no symbols, no dividers, no boxes, no cell borders, no watermark
```

## Existing global asset residual risks

This section is deliberately outside the Dragon Palace shipping table and is not interpreted as a Dragon Palace checker row. The derivation process is summarized in [`docs/verification/commercial-foundation.md`](../verification/commercial-foundation.md), while repository history provides the precise locations: at baseline `629fa42` the three source PNGs were under `public/assets/*.png`; commit `742f623` preserved the same content hashes while moving them to `assets/source/visual/*.png`, then generated and committed the `sips` JPEG derivatives without redrawing. That evidence does not recover the original generation prompts or licenses. The three audio files also predate this manifest and have no recovered source-generation or license record in the commercial-foundation evidence. Every item below is **not release-approved and has not passed visual/asset QA**; these unresolved global assets continue to block any commercial-production completion claim.

| Existing asset | Current SHA-256 | Known derivation evidence | Missing evidence | Release status |
| --- | --- | --- | --- | --- |
| assets/world-map.jpg | 391e0bad0f58bb147edeb40c7ba9e616a480851e88df5a4842795b341f795acc | Source was `public/assets/world-map.png` at `629fa42`; `742f623` moved the same-content source to `assets/source/visual/world-map.png` and generated/committed this 1536x1024 `sips` JPEG; see commercial-foundation evidence | Original generation prompt and license missing | not release-approved; not visual QA passed |
| assets/mentor.jpg | 54462d42e051b9ea35ca4acb2b7de9136b450d5e50ce52bcd948c45c99fcdd2c | Source was `public/assets/mentor.png` at `629fa42`; `742f623` moved the same-content source to `assets/source/visual/mentor.png` and generated/committed this 256x256 `sips` JPEG; see commercial-foundation evidence | Original generation prompt and license missing | not release-approved; not visual QA passed |
| assets/young-hero.jpg | 4ac6bf59da253c5ae03bd2dfe32a6fec9a8381d6c87ce60d6976bc2a0f00e5c6 | Source was `public/assets/young-hero.png` at `629fa42`; `742f623` moved the same-content source to `assets/source/visual/young-hero.png` and generated/committed this 256x256 `sips` JPEG; see commercial-foundation evidence | Original generation prompt and license missing | not release-approved; not visual QA passed |
| assets/audio/welcome.m4a | 1d3c70c7d1cacede8d7ad6b36b9fc5fc1f85bbb9c8f1ab473eff0e9bb7f08b10 | Existing homepage audio referenced by the current application; no source derivation recovered in commercial-foundation evidence | Original generation prompt/source reference and license missing | not release-approved; not visual/asset QA passed |
| assets/audio/success.m4a | abe7df3e33a34401ba82e49d290b4ffce007ce00f07c19edb8285279bb53ea90 | Existing mission-success audio referenced by the current application; no source derivation recovered in commercial-foundation evidence | Original generation prompt/source reference and license missing | not release-approved; not visual/asset QA passed |
| assets/audio/boss.m4a | 96df6b02db847c332e2c1915aced41df73f6f15a4848abe36f1524873015e578 | Existing boss-success audio referenced by the current application; no source derivation recovered in commercial-foundation evidence | Original generation prompt/source reference and license missing | not release-approved; not visual/asset QA passed |
