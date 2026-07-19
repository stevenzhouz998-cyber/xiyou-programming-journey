# Asset manifest

This manifest gates the formal Dragon Palace media in `public/assets/dragon-palace`. The asset gate verifies generation provenance, real file hashes, dimensions, exact formal scene references, and media budgets. Real-browser screenshots at 320, 390, 768, and 1440 pixels were inspected before promoting the first six approved rows to `visual-qa-passed`; DP-007 and DP-008 received original-resolution source/final inspection plus transparent-edge QA in this configuration slice and remain subject to the integrated w1-m3 viewport pass. The sixth row corrects the `w1-m2` broad-sabre semantic requirement without altering the original three-weapon sheet.

| Asset ID | SHA-256 | Purpose | Tool or source | Prompt or source reference | Dimensions | License/provenance | Screen slots | QA status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| assets/dragon-palace/background.webp | f6400e2f443ad9403beedbeb1c074abe66fa5dad34faa9db5505891b775ea2f0 | Layered Dragon Palace trial hall and readable three-zone battle floor | OpenAI built-in image_gen | [Prompt DP-001](#prompt-dp-001-background) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w1-m1, w1-m2, and w1-m3 Phaser battle scene background | visual-qa-passed |
| assets/dragon-palace/wukong.webp | af13ee6c8f6fe827add3f515245a3dfac4c6a8489bd07a101e905e3fdddee22e | Young Wukong player actor cutout | OpenAI built-in image_gen | [Prompt DP-002](#prompt-dp-002-wukong) | 640x640 | generated in-project with built-in image_gen; provenance verified | w1-m1, w1-m2, and pre-equip w1-m3 left hero actor and instruction-event states | visual-qa-passed |
| assets/dragon-palace/dragon-king.webp | 8b9fe59c2fad5bb99b7a87f0dabcedbc9fa69c81c452b5e803dbfba58e3b78c8 | Friendly-authority Dragon King actor cutout | OpenAI built-in image_gen | [Prompt DP-003](#prompt-dp-003-dragon-king) | 640x640 | generated in-project with built-in image_gen; provenance verified | w1-m1, w1-m2, and w1-m3 right-side guide and trial authority actor | visual-qa-passed |
| assets/dragon-palace/weapons.webp | 5b967dbeb97efd7f33f909bc215b3b8c315e1c9d2ce6e14713c9c9a917c00bc0 | Three separated trial weapons: spear, halberd, and heavy staff | OpenAI built-in image_gen | [Prompt DP-004](#prompt-dp-004-weapons) | 1024x512 | generated in-project with built-in image_gen; provenance verified | w1-m1 center weapon states; w1-m2 halberd and Ruyi Staff states | visual-qa-passed |
| assets/dragon-palace/sabre.webp | 2adc8aba6d92794030ec3dd863fadd7378cf3f6f279ed2ef5c833bf5f909159c | Standalone broad single-edged Chinese battle sabre (大捍刀), visually distinct from the original spear | OpenAI built-in image_gen | [Prompt DP-006](#prompt-dp-006-sabre) | 256x384 | generated in-project with built-in image_gen; provenance verified | w1-m2 three-weight and wrong-weapon sabre states | visual-qa-passed |
| assets/dragon-palace/effects.webp | 8bb99312a61a085f65a5e4384dc2c2f57a14771b8653cb3e9ea53cc2185a0230 | Three separated feedback clusters: accepted, blocked, and success | OpenAI built-in image_gen | [Prompt DP-005](#prompt-dp-005-effects) | 1024x512 | generated in-project with built-in image_gen; provenance verified | w1-m1, w1-m2, and w1-m3 instruction accepted, instruction rejected, and mission success feedback | visual-qa-passed |
| assets/dragon-palace/regalia.webp | d3be678a2122fba8772efbb73cc6313f6dd129cb4b656cfb02ebe9c727af1ae3 | Three separated Four Seas gifts: phoenix-wing purple-gold crown, golden chain armor, and matched cloud-pattern silk boots | OpenAI built-in image_gen | [Prompt DP-007](#prompt-dp-007-regalia) | 1024x512 | generated in-project with built-in image_gen; provenance verified | w1-m3 collected-gift and pre-dressing regalia states | visual-qa-passed |
| assets/dragon-palace/wukong-regalia.webp | 3ede82729e61451c768361702173801b8feca753fab6d1f877c812664447e39c | Identity-preserved young Wukong wearing all three Four Seas regalia items | OpenAI built-in image_gen | [Prompt DP-008](#prompt-dp-008-wukong-regalia) | 640x640 | generated in-project with built-in image_gen; provenance verified | w1-m3 equipped Wukong state after the complete wear sequence | visual-qa-passed |

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
