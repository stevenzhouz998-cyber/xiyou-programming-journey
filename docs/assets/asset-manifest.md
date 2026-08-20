# Asset manifest

This manifest gates the formal Dragon Palace media in `public/assets/dragon-palace` and the formal w1-m4/w1-m5 media in `public/assets/week-one-advanced`. The asset gate verifies generation provenance, real file hashes, dimensions, exact formal scene references, and media budgets. Real-browser screenshots at 320, 390, 768, and 1440 pixels were inspected before promoting the first six approved rows to `visual-qa-passed`; DP-007 and DP-008 have now also passed the integrated w1-m3 original-resolution viewport QA at 320, 390, 768, and 1440 pixels plus the 768-pixel wrong-order state, with the complete connected Blockly graph visible beside the formal scene. AW1-001 through AW1-004 were inspected at original resolution before integration; their final in-browser viewport evidence is recorded separately in the w1-m4/w1-m5 verification report. The sixth row corrects the `w1-m2` broad-sabre semantic requirement without altering the original three-weapon sheet.

| Asset ID | SHA-256 | Purpose | Tool or source | Prompt or source reference | Dimensions | License/provenance | Screen slots | QA status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| assets/dragon-palace/background.webp | f6400e2f443ad9403beedbeb1c074abe66fa5dad34faa9db5505891b775ea2f0 | Layered Dragon Palace trial hall and readable three-zone battle floor | OpenAI built-in image_gen | [Prompt DP-001](#prompt-dp-001-background) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w1-m1, w1-m2, and w1-m3 Phaser battle scene background | visual-qa-passed |
| assets/dragon-palace/wukong.webp | af13ee6c8f6fe827add3f515245a3dfac4c6a8489bd07a101e905e3fdddee22e | Young Wukong player actor cutout | OpenAI built-in image_gen | [Prompt DP-002](#prompt-dp-002-wukong) | 640x640 | generated in-project with built-in image_gen; provenance verified | w1-m1, w1-m2, and pre-equip w1-m3 left hero actor and instruction-event states | visual-qa-passed |
| assets/dragon-palace/dragon-king.webp | 8b9fe59c2fad5bb99b7a87f0dabcedbc9fa69c81c452b5e803dbfba58e3b78c8 | Friendly-authority Dragon King actor cutout | OpenAI built-in image_gen | [Prompt DP-003](#prompt-dp-003-dragon-king) | 640x640 | generated in-project with built-in image_gen; provenance verified | w1-m1, w1-m2, and w1-m3 right-side guide and trial authority actor | visual-qa-passed |
| assets/dragon-palace/weapons.webp | 5b967dbeb97efd7f33f909bc215b3b8c315e1c9d2ce6e14713c9c9a917c00bc0 | Three separated trial weapons: spear, halberd, and heavy staff | OpenAI built-in image_gen | [Prompt DP-004](#prompt-dp-004-weapons) | 1024x512 | generated in-project with built-in image_gen; provenance verified | w1-m1 center weapon states; w1-m2 halberd and Ruyi Staff states; EquipmentDrawer Ruyi Staff reward cell | visual-qa-passed |
| assets/dragon-palace/sabre.webp | 2adc8aba6d92794030ec3dd863fadd7378cf3f6f279ed2ef5c833bf5f909159c | Standalone broad single-edged Chinese battle sabre (大捍刀), visually distinct from the original spear | OpenAI built-in image_gen | [Prompt DP-006](#prompt-dp-006-sabre) | 256x384 | generated in-project with built-in image_gen; provenance verified | w1-m2 three-weight and wrong-weapon sabre states | visual-qa-passed |
| assets/dragon-palace/effects.webp | 8bb99312a61a085f65a5e4384dc2c2f57a14771b8653cb3e9ea53cc2185a0230 | Three separated feedback clusters: accepted, blocked, and success | OpenAI built-in image_gen | [Prompt DP-005](#prompt-dp-005-effects) | 1024x512 | generated in-project with built-in image_gen; provenance verified | w1-m1, w1-m2, and w1-m3 instruction accepted, instruction rejected, and mission success feedback | visual-qa-passed |
| assets/dragon-palace/regalia.webp | d3be678a2122fba8772efbb73cc6313f6dd129cb4b656cfb02ebe9c727af1ae3 | Three separated Four Seas gifts: phoenix-wing purple-gold crown, golden chain armor, and matched cloud-pattern silk boots | OpenAI built-in image_gen | [Prompt DP-007](#prompt-dp-007-regalia) | 1024x512 | generated in-project with built-in image_gen; provenance verified | w1-m3 collected-gift and pre-dressing regalia states; EquipmentDrawer head, body, and feet reward cells | visual-qa-passed |
| assets/dragon-palace/wukong-regalia.webp | 3ede82729e61451c768361702173801b8feca753fab6d1f877c812664447e39c | Identity-preserved young Wukong wearing all three Four Seas regalia items | OpenAI built-in image_gen | [Prompt DP-008](#prompt-dp-008-wukong-regalia) | 640x640 | generated in-project with built-in image_gen; provenance verified | w1-m3 equipped Wukong state after the complete wear sequence | visual-qa-passed |
| assets/week-one-advanced/underworld-background.webp | 7ab2df7030a5980e87b40ced35795fe0f5805bd1e759c3eaa987e04f6439a1b1 | Warm child-friendly records-room environment for the Underworld lookup task | OpenAI built-in image_gen | [Prompt AW1-001](#prompt-aw1-001-underworld-background) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w1-m4 AdvancedWeekOneScene background branch | visual-qa-passed |
| assets/week-one-advanced/register-states.webp | a37822649b566098b2cf8813be65b359dc788ce5fd699947ee2925d1ddca8bbd | Four-stage closed, indexed, matched, and handled register state sheet | OpenAI built-in image_gen | [Prompt AW1-002](#prompt-aw1-002-register-states) | 2048x1152 | generated in-project with built-in image_gen; provenance verified | w1-m4 AdvancedWeekOneScene states sprite branch | visual-qa-passed |
| assets/week-one-advanced/boss-journey-background.webp | 5137b32c772c0b959717a718a40838cf516b762db6a085130291e309f6a356e7 | Cohesive first-week planning hall with comparison, decomposition, and lookup stations | OpenAI built-in image_gen | [Prompt AW1-003](#prompt-aw1-003-boss-journey-background) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w1-m5 AdvancedWeekOneScene background branch | visual-qa-passed |
| assets/week-one-advanced/boss-checkpoints.webp | 77978522df022c4c04039d831d8c0f9c989bb323058cb0b9e12152cdb4b7c6b0 | Six-stage Boss planning, Dragon Palace, comparison, regalia, register, and verification sheet | OpenAI built-in image_gen | [Prompt AW1-004](#prompt-aw1-004-boss-checkpoints) | 3072x1152 | generated in-project with built-in image_gen; provenance verified | w1-m5 AdvancedWeekOneScene states sprite branch | visual-qa-passed |

## Prompt records

All eight accepted source illustrations were generated through separate calls to the environment's built-in `image_gen` tool. Generation sources remain outside `public` and outside this repository. The keyed sources were processed with the official imagegen Skill helper `remove_chroma_key.py` using border auto-key sampling, soft matte, thresholds 12/220, and despill. Pillow/Sharp then performed only technical crop-to-content, resize, transparent-canvas placement, and WebP encoding. Existing compositions retain their prior encoding; DP-006 is a 256x384 transparent WebP encoded by Sharp 0.35.3 (`quality: 30`, `alphaQuality: 75`, `effort: 6`, `smartSubsample: true`) to preserve the fixed cold-load budget. DP-007 and DP-008 were encoded at 1024x512 and 640x640 with Sharp (`quality: 76`, `alphaQuality: 90`, `effort: 6`, `smartSubsample: true`). A first magenta-key DP-008 attempt was rejected during alpha QA because its purple clothing conflicted with the key; it was not shipped and is not an accepted prompt record. No artwork was redrawn in code.

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

### Prompt DP-006 sabre

```text
Use case: stylized-concept
Asset type: transparent game weapon cutout source, final raster illustration for a children's coding battle scene
Primary request: create exactly one clearly recognizable Chinese broad giant battle sabre (大捍刀), not a spear, not a straight double-edged sword, not a halberd, and not a staff
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for local background removal
Subject: one complete upright Chinese single-edged broad battle sabre with a visibly wide heavy curved blade, blunt spine, one cutting edge, compact ornate gold dragon guard, short red-wrapped hand grip, and a gold pommel; the blade is jade-green metal with restrained engraved dragon-cloud details and pale gold edge trim
Style/medium: commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.
Composition/framing: centered single weapon, vertical from blade tip to pommel, full object visible, generous even padding, opaque crisp silhouette, sized to remain readable around 132x198 in a Phaser scene
Lighting/mood: polished collectible game art, adventurous, child-friendly, high readability
Constraints: the background must be one perfectly uniform #ff00ff color with no shadows, gradients, texture, reflections, floor plane, or lighting variation; no cast shadow, no contact shadow, no reflection; do not use magenta or #ff00ff anywhere in the weapon; exactly one weapon only; broad single-edged sabre anatomy must be unmistakable; no scabbard, no hands, no characters, no detached pieces, no magical effects, no watermark, no text
Avoid: spear points, spear shafts, symmetric double-edged straight-sword anatomy, polearm-length handles, crescent halberd blades, multiple objects
```

### Prompt DP-007 regalia

```text
Use case: stylized-concept
Asset type: transparent-ready three-object regalia sprite sheet, final raster illustration for the w1-m3 Four Seas code battle
Primary request: create exactly three separated Journey to the West regalia subjects: one ornate phoenix-wing purple-gold crown (凤翅紫金冠), one complete articulated golden chain armor (黄金锁子甲), and one clearly matched pair of cloud-pattern silk walking boots (成对藕丝步云履)
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for local background removal
Subject: left third contains one complete phoenix-wing purple-gold crown with two readable swept phoenix-wing ornaments; center third contains one complete torso-shaped articulated golden chain armor with sleeves and waist guards; right third contains exactly one matched pair of complete cloud-pattern silk walking boots placed side by side as one paired subject
Style/medium: commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.
Composition/framing: exact 2:1 horizontal composition intended for 1024x512; three equal imaginary cells; one regalia subject centered inside each third; generous even padding and clear empty spacing between cells; every object fully visible; no overlap, merging, fused silhouettes, dividers, boxes, or cell borders
Lighting/mood: polished collectible game art, dignified, adventurous, child-friendly, high readability
Constraints: the background must be one perfectly uniform #ff00ff color with no shadows, gradients, texture, reflections, floor plane, or lighting variation; no cast shadow, no contact shadow, no reflection; do not use magenta or #ff00ff anywhere in any subject; exactly the three requested subjects only; no character, no person, no monkey, no weapon, no detached decorative object, no magical effect, no watermark, no words, no letters, no numbers
Avoid: overlapping objects, crown fused to armor, boots fused together, extra boots, missing boot, background scenery, frames, labels
```

### Prompt DP-008 wukong regalia

```text
Use case: identity-preserve
Asset type: transparent game character cutout, equipped Wukong final raster illustration for the w1-m3 Four Seas code battle
Input images: Image 1 is the approved edit target and identity/style reference; preserve its exact child-friendly young Wukong face, warm brown monkey features, short dark-gold fur, compact proportions, full-body neutral ready stance, expression, and centered cutout composition
Primary request: change only the clothing and headgear so the same Wukong is visibly wearing all three exact Journey to the West regalia items: an ornate phoenix-wing purple-gold crown (凤翅紫金冠), complete articulated golden chain armor (黄金锁子甲), and a matched pair of cloud-pattern silk walking boots (成对藕丝步云履)
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for local background removal
Subject: exactly one full-body child-friendly Wukong from the reference, empty hands; the purple-gold crown is clearly visible on his head with two readable phoenix-wing ornaments, bright golden chain armor with cinnabar and purple cloth accents covers his torso and limbs without hiding his face or hands, and both matched purple-and-gold cloud-pattern silk boots are fully visible on his feet
Style/medium: commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.
Composition/framing: centered full body from crown tip to both boots, same front-facing neutral ready stance and compact proportions as Image 1, complete limbs and hands, generous even padding, crisp opaque silhouette
Lighting/mood: friendly, brave, dignified, child-safe, polished collectible character art
Constraints: preserve the reference face, body proportions, stance, hand position, facial expression, fur color, and identity; change only the approved regalia outfit; the background must be one perfectly uniform #00ff00 color with no shadows, gradients, texture, reflections, floor plane, or lighting variation; no cast shadow, no contact shadow, no reflection; absolutely no green, jade-green, teal, emerald, lime, or #00ff00 anywhere in the subject or its clothing; exactly one character; no weapon, staff, sword, extra character, detached object, magic effect, floor, scenery, watermark, words, letters, numbers
Avoid: altered face, adult proportions, aggressive pose, missing crown wing, missing armor, missing boot, fused feet, cropped crown, cropped boots, background decoration, any green color on Wukong
```

### Prompt AW1-001 underworld background

```text
Use case: illustration-story
Asset type: w1-m4 formal game scene background, target 1600x900 16:9
Primary request: create a warm, child-friendly Chinese fantasy records room in the Underworld for a coding learning game; this is a calm archive and problem-solving space, never horror
Input images: approved Dragon Palace background is style reference only; do not reuse the Dragon Palace architecture or underwater content
Scene/backdrop: spacious traditional records hall with orderly wooden shelves of bound ledgers, jade-green beams, cinnabar accents, warm amber lanterns, a softly glowing central reading desk, gentle lavender-blue mist beyond an open arch
Style/medium: polished 3D children's storybook game illustration matching the reference's rounded forms, rich material detail, teal-jade-gold palette, friendly commercial game art
Composition/framing: exact 16:9 wide scene, clear open foreground stage, desk slightly right of center, usable left and center space for Wukong and UI overlays, no close-up objects at edges
Lighting/mood: bright, curious, welcoming, safe, calm
Constraints: environment only; no characters; no text; no letters; no symbols; no watermark; no skulls; no ghosts; no graves; no weapons; no fire; no fear; no punishment; coherent single scene, not a collage
Processing: the accepted 1672x941 built-in image_gen output was crop-to-fit resized without stretching to 1600x900 and WebP encoded by Sharp 0.35.3 at quality 76 and effort 6.
```

### Prompt AW1-002 register states

```text
Use case: illustration-story
Asset type: w1-m4 register state sprite sheet for a formal game scene
Primary request: create one exact 2 columns x 2 rows sprite sheet, four equal 16:9 cells; each cell shows the same ornate child-friendly Chinese fantasy ledger progressing through four clear states
Cell 1 top-left: the teal-and-gold ledger closed, calm neutral glow
Cell 2 top-right: the same ledger open to a tidy index with colored tabs and blank line patterns
Cell 3 bottom-left: the same open ledger with several matching rows softly highlighted in jade light, magnifying lens beside it
Cell 4 bottom-right: the same ledger neatly organized, matched rows marked complete with warm gold seals and a gentle success glow
Style/medium: polished 3D children's storybook game asset, rounded friendly forms, jade teal cinnabar and gold, consistent camera and scale across all cells
Composition/framing: four cells aligned perfectly with equal padding; each cell is 16:9 and contains one centered ledger; strict 2x2 grid; no gutters or borders that change cell size
Constraints: actual transparent background across the sheet; no characters; no readable writing; no letters; no numbers; no watermark; no skulls, ghosts, death imagery, fear, weapons, punishment, blood, or horror
Accepted edit: remove only the gray-and-white checkerboard background and replace it with genuine fully transparent alpha while preserving the four ledger sprites, their strict 2x2 positions, scale, colors, shapes, highlights, magnifying lens, seals and shadows.
Processing: the accepted alpha output was cleaned only by removing three isolated non-subject pixels, crop-to-fit resized without stretching to 2048x1152, and WebP encoded by Sharp 0.35.3 at quality 78, alphaQuality 100 and effort 6.
```

### Prompt AW1-003 boss journey background

```text
Use case: illustration-story
Asset type: w1-m5 formal Boss journey-board scene background, target 1600x900 16:9
Primary request: create a single cohesive child-friendly Chinese fantasy strategy hall that visually unites the four learning concepts from Journey to the West chapter three without copying earlier level answers
Input images: approved Dragon Palace and friendly records-room images are style references; blend their commercial children's game art language, not their exact layouts
Scene/backdrop: an ornate circular planning hall with a large glowing floor route; four distinct but harmonized stations around the route: an open palace arch, a balanced scale pedestal, three gift pedestals, and a calm archive arch; the route converges on one central verification dais
Style/medium: polished 3D children's storybook game illustration, rounded friendly forms, jade teal cinnabar and gold, same richness and lighting quality as references
Composition/framing: exact 16:9 wide scene, symmetrical and readable, clear open central foreground for Wukong and overlays, stations around edges but not cropped, one coherent room rather than a collage
Lighting/mood: celebratory first-week challenge, confident and inviting, not combat, not dangerous
Constraints: environment only; no characters; no text; no letters; no numbers; no watermark; no enemies; no skulls; no ghosts; no weapons; no fear; no punishment; no fire
Accepted edit: change only the three bottom-left pedestal objects into a phoenix-wing golden crown, folded golden chainmail tunic and matched cloud-walking boots while preserving the room, lighting, scale, archive, balance station and route.
Processing: the accepted 1672x941 edit output was crop-to-fit resized without stretching to 1600x900 and WebP encoded by Sharp 0.35.3 at quality 76 and effort 6.
```

### Prompt AW1-004 boss checkpoints

```text
Use case: illustration-story
Asset type: w1-m5 Boss checkpoint sprite sheet for a formal game scene
Primary request: create one exact 3 columns x 2 rows sprite sheet, six equal checkpoint cells on an actual transparent background and show progressive mastery
Cell 1 top-left: unlit circular planning seal with four empty jade sockets
Cell 2 top-center: glowing Dragon Palace arch checkpoint emblem
Cell 3 top-right: balanced golden scale with a small adjustable golden staff selected by a jade light
Cell 4 bottom-left: phoenix-wing crown, golden chainmail tunic and matched cloud-walking boots arranged as three completed subtasks
Cell 5 bottom-center: ornate open ledger with magnifying lens and several jade-highlighted blank rows
Cell 6 bottom-right: one bright central verification seal surrounded by small completed versions of palace arch, scale/staff, three regalia items and ledger
Style/medium: polished 3D children's storybook game asset, rounded friendly forms, jade teal cinnabar and gold, consistent camera, lighting and scale in all six cells
Composition/framing: strict 3x2 grid with equal padding; no gutters or borders that alter cell size
Constraints: actual transparent background; no characters; no readable writing; no letters; no numbers; no watermark; no enemies, skulls, ghosts, fear, punishment, blood, fire or combat; the staff is a small learning-selection icon, not shown attacking
Processing: each of the six generated cells was extracted on its exact source-grid boundary and placed without stretching into a 1024x576 transparent cell, producing a 3072x1152 3x2 sheet; WebP encoding used Sharp 0.35.3 quality 26, alphaQuality 72 and effort 6 to remain under the fixed 512 KiB single-raster and 3.0 MiB cold-load budgets. No artwork was redrawn in code.
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
