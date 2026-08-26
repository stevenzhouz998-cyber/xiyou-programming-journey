# Asset manifest

This manifest gates the formal Dragon Palace media in `public/assets/dragon-palace` and the formal w1-m4/w1-m5 media in `public/assets/week-one-advanced`. The asset gate verifies generation provenance, real file hashes, dimensions, exact formal scene references, and media budgets. Real-browser screenshots at 320, 390, 768, and 1440 pixels were inspected before promoting the first six approved rows to `visual-qa-passed`; DP-007 and DP-008 have now also passed the integrated w1-m3 original-resolution viewport QA at 320, 390, 768, and 1440 pixels plus the 768-pixel wrong-order state, with the complete connected Blockly graph visible beside the formal scene. AW1-001 through AW1-004 were inspected at original resolution before integration; their final in-browser viewport evidence is recorded separately in the w1-m4/w1-m5 verification report. W2M3-001 and W2M3-002 passed original-file inspection plus five-project 320/390/768/1440 browser QA with the real coloured Blockly pixels, wrong-order and completion states visible and no fake transparency, overflow, pseudo-text, or clipping. The sixth row corrects the `w1-m2` broad-sabre semantic requirement without altering the original three-weapon sheet.

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
| assets/week-two-heaven/stable-background.webp | b0aeaf621ab91e9548c31cc9b45dc3cccba0e6d73bd26975fe389884302ec990 | Bright child-friendly Heavenly Stable courtyard with three readable care stalls | OpenAI built-in image_gen | [Prompt W2H-001](#prompt-w2h-001-stable-background) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w2-m1 WeekTwoHorseScene background branch | visual-qa-passed |
| assets/week-two-heaven/horse-care-states.webp | 7135a009014763e83fd57760ff84cac26cbe582b7a2dd1ff5666bbb85a82e9a1 | Four-stage zero, one, two, and three completed horse-care loop state sheet | OpenAI built-in image_gen | [Prompt W2H-002](#prompt-w2h-002-horse-care-states) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w2-m1 WeekTwoHorseScene states sprite branch | visual-qa-passed |
| assets/week-two-great-sage/flower-fruit-background.webp | 26ef39f2241bcb90a1379b4569e696a0624646c5d05f703f4bfae4e8fc8d43c5 | Bright Flower Fruit Mountain ceremonial clearing with open event-playback stage | OpenAI built-in image_gen | [Prompt W2M2-001](#prompt-w2m2-001-flower-fruit-background) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w2-m2 WeekTwoMonkeyKingScene background branch | visual-qa-passed |
| assets/week-two-great-sage/great-sage-event-states.webp | fd8dae0bead9fc99a44547c62ed71ad4b41a7f956f8533398d727913c09a1c7b | Four-stage bare event stage, raised flag, accepted title seal, and completed residence sprite sheet | OpenAI built-in image_gen | [Prompt W2M2-002](#prompt-w2m2-002-great-sage-event-states) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w2-m2 WeekTwoMonkeyKingScene states sprite branch | visual-qa-passed |
| assets/week-two-peach-elixir/heavenly-route-background.webp | 96d46eba51c9679e72361184a651f1c231a9e7cc46d0a5b6651f6f9e6ecd136c | Left-to-right celestial route linking the Peach Garden, Jade Pool banquet terrace, and Tusita Palace | OpenAI built-in image_gen | [Prompt W2M3-001](#prompt-w2m3-001-heavenly-route-background) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w2-m3 WeekTwoPeachElixirScene background branch | visual-qa-passed |
| assets/week-two-peach-elixir/peach-elixir-states.webp | 246eb60639a6ba2be2617bda1abdf2851a0f9f3f2f7db021792d20f471ef1e26 | Six-stage waiting, garden, banquet news, Jade Pool, Tusita, and elixir sprite sheet | OpenAI built-in image_gen | [Prompt W2M3-002](#prompt-w2m3-002-peach-elixir-states) | 1536x1024 | generated in-project with built-in image_gen; provenance verified | w2-m3 WeekTwoPeachElixirScene states sprite branch | visual-qa-passed |
| assets/week-two-furnace/furnace-interior-background.webp | b81e7ba0bda15864414fede26c569fe936e371a18b6fa83d2f87b6aa99f24302 | Bright octagonal Eight-Trigram Furnace interior with Xun shelter, fire, smoke, and opening furnace door | OpenAI built-in image_gen | [Prompt W2M4-001](#prompt-w2m4-001-furnace-interior-background) | 1672x941 | generated in-project with built-in image_gen; provenance verified | w2-m4 WeekTwoFurnaceConditionScene background branch | visual-qa-passed |
| assets/week-two-furnace/furnace-condition-states.webp | 6425fc81710c82100cff9fff77d6a4a3d9a202ddb1b4ed2ed00ee16759325bc6 | Seven-stage furnace waiting and safe escape state sheet | OpenAI built-in image_gen | [Prompt W2M4-002](#prompt-w2m4-002-furnace-condition-states) | 1672x941 | generated in-project with built-in image_gen; provenance verified | w2-m4 WeekTwoFurnaceConditionScene state branch | visual-qa-passed |
| assets/week-two-heavenly-boss/signal-dispatch-background.webp | 7de0fd49cf2bf49af546e8a8e6302179ee4fc2fe798b64d379015ee820bac21d | Connected Heavenly Signal Dispatch landscape spanning stable, flag terrace, peach route, furnace and calm epilogue zone | OpenAI built-in image_gen | [Prompt W2M5-001](#prompt-w2m5-001-heavenly-dispatch-background) | 1672x941 | generated in-project with built-in image_gen; provenance verified | w2-m5 WeekTwoHeavenlySignalBossScene background branch | visual-qa-passed |
| assets/week-two-heavenly-boss/heavenly-boss-states.webp | 646fbeb3f965ff5a6b868bf0d6f613329c485bd658489e8b4556db8099168bc8 | Multi-stage signal, horse-care, furnace and calm canonical-epilogue state sheet | OpenAI built-in image_gen | [Prompt W2M5-002](#prompt-w2m5-002-heavenly-boss-states) | 1672x941 | generated in-project with built-in image_gen; provenance verified | w2-m5 WeekTwoHeavenlySignalBossScene states branch | visual-qa-passed |
| assets/week-three-manor-help/manor-help-background.webp | 0464a6c9038f79cfe7ddf61a4d3e4272d41d74eef920921686922227620aa4d2 | Bright Gao Family Manor roadside environment with an open message-playback foreground | OpenAI built-in image_gen | [Prompt W3M1-001](#prompt-w3m1-001-manor-help-background) | 1672x941 | generated in-project with built-in image_gen; provenance verified | w3-m1 WeekThreeManorHelpScene | visual-qa-passed |
| assets/week-three-manor-help/manor-message-states.webp | 6a27fb45bb269146b4bf08182d872a09b4dc3488f267ee04032b030c2b2cab41 | Transparent Gao Cai request-and-return plus ordinary villager directions-and-continue state sheet | OpenAI built-in image_gen | [Prompt W3M1-002](#prompt-w3m1-002-manor-message-states) | 1672x941 | generated in-project with built-in image_gen; provenance verified | w3-m1 WeekThreeManorHelpScene | visual-qa-passed |

## Prompt records

Accepted source illustrations were generated through separate calls to the environment's built-in `image_gen` tool. Generation sources remain outside `public` and outside this repository. The keyed sources were processed with local alpha removal, and Pillow/Sharp then performed only technical crop-to-content, resize, transparent-canvas placement, and WebP encoding. Existing compositions retain their prior encoding; DP-006 is a 256x384 transparent WebP encoded by Sharp 0.35.3 (`quality: 30`, `alphaQuality: 75`, `effort: 6`, `smartSubsample: true`) to preserve the fixed cold-load budget. DP-007 and DP-008 were encoded at 1024x512 and 640x640 with Sharp (`quality: 76`, `alphaQuality: 90`, `effort: 6`, `smartSubsample: true`). A first magenta-key DP-008 attempt was rejected during alpha QA because its purple clothing conflicted with the key; it was not shipped and is not an accepted prompt record. No artwork was redrawn in code.

### Prompt W2M4-001 furnace interior background

```text
Use case: illustration-story
Asset type: production W2-M4 background
Primary request: bright 3D Chinese children's storybook interior of an Eight-Trigram Furnace with a Xun-position shelter, gentle fire, smoke, and an openable furnace door; no text or UI.
Style/medium: polished 3D children's storybook game
```

### Prompt W2M4-002 furnace condition states

```text
Use case: illustration-story
Asset type: production W2-M4 state sheet
Primary request: seven child-friendly Eight-Trigram Furnace waiting stages progressing to a safe Monkey King escape; no text, numbers, UI, or borders.
Style/medium: polished 3D children's storybook game
```

### Prompt W2M5-001 heavenly dispatch background

```text
Use case: illustration-story
Asset type: production W2-M5 Heavenly Signal Dispatch background
Primary request: one bright 3D Chinese children's storybook celestial journey landscape connecting a heavenly stable, blank flag terrace, peach garden, Jade Pool, Tusita palace, open Eight-Trigram Furnace and a quiet Five Elements Mountain epilogue area.
Style/medium: polished 3D children's storybook game, warm cloud light, jade, peach, vermilion and gold.
Constraints: no text, letters, numbers, logos, UI, watermark, pseudo-writing, checkerboard, transparency, battle, fear or punishment imagery.
Processing: accepted built-in image_gen PNG was visually reviewed at original resolution then technically WebP encoded by Sharp 0.35.3 at quality 82 without crop, redraw, compositing or content edits.
```

### Prompt W2M5-002 heavenly Boss states

```text
Use case: illustration-story
Asset type: production W2-M5 Heavenly Signal Boss state sheet
Primary request: a bright 3D Chinese children's storybook state sheet showing three cared heavenly horses, a blank golden flag, heavenly residence, peach and banquet journey, seven furnace waiting stages, safe escape and a calm canonical epilogue.
Style/medium: polished 3D children's storybook game, jade, peach pink, warm gold and vermilion, gentle cloud light.
Constraints: no text, letters, numbers, logos, UI, watermark, pseudo-writing, checkerboard, transparency, battle, fear or punishment imagery.
Processing: accepted built-in image_gen PNG was visually reviewed at original resolution then technically WebP encoded by Sharp 0.35.3 at quality 82 without crop, redraw, compositing or content edits.
```

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

### Prompt W2H-001 stable background

```text
Use case: illustration-story
Asset type: w2-m1 formal game scene background, target 1600x900 16:9
Primary request: create a warm, child-friendly Heavenly Stable courtyard from Journey to the West for a coding learning game about repeat loops
Scene/backdrop: spacious traditional celestial horse stable courtyard above soft clouds, jade-green tiled roofs, cinnabar timber, gold fittings, three orderly open horse stalls visible across the middle distance, a calm path leading toward a distant heavenly gate, gentle cloud banks and blue sky
Style/medium: polished 3D children's storybook game illustration matching a commercial Chinese mythology learning game, rounded friendly forms, rich material detail, jade teal cinnabar and gold palette
Composition/framing: exact 16:9 wide environment, open foreground stage, three stalls clearly readable but no close-up object cropping, usable center and lower space for state overlays
Lighting/mood: bright morning, welcoming, curious, safe, calm
Constraints: environment only; no characters; no animals; no text; no letters; no numbers; no symbols; no watermark; no weapons; no combat; no fear; no punishment; no fire; one coherent scene, not a collage
Avoid: dark dungeon mood, realistic violence, modern objects, UI frames, fake text
Processing: the accepted built-in image_gen output was crop-to-fit resized without stretching to 1600x900 and WebP encoded by Sharp 0.35.3 at quality 76 and effort 6.
```

### Prompt W2H-002 horse care states

```text
Use case: illustration-story
Asset type: w2-m1 horse-care state sprite sheet for a formal game scene
Primary request: create one exact 2 columns x 2 rows sprite sheet, four equal 16:9 cells showing the same three child-friendly celestial horses and care markers progressing from zero active, to one jade active, to two jade active, to three gold active
Style/medium: polished 3D children's storybook game asset, rounded friendly forms, jade teal cinnabar and gold, consistent camera, lighting, horse identities, positions and scale in every cell
Composition/framing: strict 2x2 grid; four equal 16:9 cells; generous equal padding; horses fully visible; no gutters, borders or labels; each cell aligns for sprite cropping
Constraints: exactly three horses per cell; no people; no readable text; no letters; no numbers; no watermark; no weapons; no combat; no fear; no punishment; no fire
Accepted edits: remove the rejected fake-checkerboard transparency, replace only the background with one uniform #ff00ff chroma key, preserve all horses, markers, glows and stage positions, then remove only the chroma background locally into genuine alpha.
Processing: the four exact source-grid cells were placed into 800x450 slots without redrawing, producing a 1600x900 2x2 transparent sheet; WebP encoding used Sharp 0.35.3 quality 28, alphaQuality 100 and effort 6. No artwork was redrawn in code.
```

### Prompt W2M2-001 flower fruit background

```text
Use case: illustration-story
Asset type: w2-m2 formal game scene background, target 1600x900 16:9
Input image 1: w2-m1 stable background as style reference only; match its polished 3D children's storybook rendering, rounded forms, material quality, bright safe lighting, and jade-teal/cinnabar/gold palette. Do not copy its stable architecture or composition.
Shared art direction: polished 3D children's storybook game.
Primary request: create a child-friendly Flower Fruit Mountain ceremonial clearing from Journey to the West for a coding learning game about event handlers
Scene/backdrop: a broad sunlit mountain terrace above waterfalls and peach-blossom valleys, weathered pale stone platform, lush green cliffs, distant Water Curtain Cave falls, open blue sky and soft clouds
Composition/framing: exact wide 16:9 environment; keep the center and lower-left foreground open as a clean stage for a separate event-state overlay
Constraints: environment only; no people; no monkeys; no animals; no readable text; no letters; no numbers; no symbols; no watermark; no weapons; no combat; no fear; no punishment; no fire
Accepted edit: remove both generated hanging banners and their poles because their gold patterns resembled pseudo-writing; keep the mountain, waterfalls, terrace, light, camera and every other object unchanged.
Processing: the accepted built-in image_gen edit was crop-to-fit resized without stretching to 1600x900 and WebP encoded by Sharp 0.35.3 at quality 76 and effort 6.
```

### Prompt W2M2-002 great sage event states

```text
Use case: illustration-story
Asset type: w2-m2 four-stage event-state sprite sheet for a formal game scene
Input image 1: w2-m1 horse-care sheet as style and grid reference only; do not copy horses or pedestals.
Shared art direction: polished 3D children's storybook game.
Primary request: create one strict 2 columns x 2 rows sheet with four equal 16:9 cells showing the same Flower Fruit Mountain ceremonial objects progressing through four states: bare jade-and-gold dais and flagpole; the same dais with one blank red sunburst flag; the same flag plus one unwritten gold-and-jade heavenly appointment seal; the same flag and seal plus one red-pillared jade-roofed residence pavilion.
Composition/framing: same camera, scale, object positions and lighting in every cell; all objects fully visible; no gutters, borders, labels, captions or dividers.
Constraints: genuinely transparent background; no people; no monkeys; no animals; no readable text; no Chinese characters; no letters; no numbers; no pseudo-writing; no runes; no watermark; no weapons; no combat; no fear; no punishment; no fire.
Accepted edit: replace only the rejected fake checkerboard background with uniform #ff00ff while preserving all objects and alignment.
Processing: Sharp 0.35.3 crop-to-fit resized the accepted edit without stretching to 1600x900, removed only chroma pixels meeting r>180, b>180, g<120 and min(r,b)-g>90 into genuine alpha, then WebP encoded at quality 60, alphaQuality 100 and effort 6. No artwork was redrawn in code.
```

### Prompt W2M3-001 heavenly route background

```text
Use case: illustration-story
Asset type: shipping 16:9 game-scene background for a Chinese children's Blockly learning website
Shared art direction: polished 3D children's storybook game.
Primary request: Create a polished wide cinematic 3D children's storybook illustration of the heavenly route in Journey to the West chapter five, visually connecting the Peach Garden, the Jade Pool banquet courtyard, and the distant Tusita Palace as three clearly distinct locations in one coherent scene.
Scene/backdrop: luminous celestial terraces above soft clouds; left foreground is a lush peach orchard with ripe peaches and carved stone paths; center is an elegant but unoccupied banquet terrace with vessels and warm lantern light; right distance is a tall alchemy palace with a glowing bronze furnace silhouette, connected by a winding cloud path.
Subject: environment only, no character closeups; the route itself must be easy to read from left to right.
Style/medium: high-quality bright 3D animated children's film / premium storybook render, consistent with an upbeat Chinese mythology learning game, rounded forms, rich but controlled detail.
Composition/framing: 16:9 landscape, safe center and right areas for an overlaid progress sprite, clear foreground/midground/depth, no UI frame.
Lighting/mood: warm sunrise-gold and peach-pink light, magical, welcoming, non-threatening.
Color palette: peach coral, jade green, celestial blue, warm gold, ivory cloud.
Constraints: no text, no letters, no numerals, no signs, no banners, no logos, no watermark, no interface elements, no fake transparency, no checkerboard, no legacy world-map look, no modern objects, no weapons, no violence.
Processing: the accepted 1672x941 built-in image_gen output was crop-to-fit resized without stretching to 1600x900 and WebP encoded by Sharp 0.35.3 at quality 82 and effort 6. No artwork was redrawn in code.
```

### Prompt W2M3-002 peach elixir states

```text
Use case: illustration-story
Asset type: shipping six-frame state sprite sheet for a Chinese children's Blockly learning game
Shared art direction: polished 3D children's storybook game.
Primary request: Create one clean 3-by-2 sprite sheet with exactly six equal rectangular cells, each cell showing the same friendly stylized Monkey King character and a single readable story-state vignette from Journey to the West chapter five.
Frame order, left to right on top row then left to right on bottom row: 1) waiting thoughtfully beside a cloud path; 2) caring for a peach garden; 3) listening with curiosity to seven distant celestial maidens represented unobtrusively; 4) arriving at an empty Jade Pool banquet terrace with a small wine vessel; 5) surprised after wandering into the Tusita alchemy palace beside a bronze furnace; 6) final resolved pose beside a golden elixir gourd, with a gentle golden glow.
Style/medium: polished bright 3D animated children's film / premium storybook render, rounded expressive forms, same character model, costume, proportions, lighting and camera angle in every cell, matching a warm Chinese mythology learning website.
Composition/framing: exact 3 columns by 2 rows, consistent centered full-body figure scale, generous internal padding, no overlap across cell boundaries, no outer decorative frame.
Lighting/mood: warm, magical, friendly, non-threatening.
Color palette: peach coral, jade green, celestial blue, warm gold, ivory.
Background: genuinely transparent alpha background across the whole sheet; subtle grounded shadows may remain but no painted backdrop.
Constraints: no text, no letters, no numerals, no labels, no signs, no banners, no logos, no watermark, no UI icons, no checkerboard pattern, no fake transparency, no weapons, no violence, exactly six cells and no extra characters except the small distant maidens in frame 3.
Processing: the accepted built-in output supplied genuine RGBA alpha (corner and center negative-space samples alpha 0; output metadata hasAlpha true). The separate background-removal edit was rejected because it produced a fake opaque checkerboard and is not shipped. The accepted source was WebP encoded by Sharp 0.35.3 at quality 76, alphaQuality 100 and effort 6, preserving the 1536x1024 3x2 grid. No artwork was redrawn in code.
```

### Prompt W3M1-001 manor help background

```text
Use case: illustration-story
Asset type: W3-M1 formal game scene background, wide 16:9 landscape
Primary request: Polished bright 3D Chinese children's storybook game environment inspired by Journey to the West chapter 18, a spring roadside immediately outside Gao Family Manor.
Scene/backdrop: Traditional Chinese manor gate in the middle distance, tiled roofs, warm wooden architecture, flowering spring trees, soft hills and a clear road leading toward the gate.
Subject: Environment only, with a broad clean foreground stage reserved for showing two message scenarios later in the game UI; no principal characters and no story actions baked into the background.
Style/medium: High-quality friendly 3D children's storybook illustration consistent with a commercial educational game.
Composition/framing: Wide landscape, readable at phone width, manor gate centered slightly right, open foreground and left-side breathing room, no UI framing.
Lighting/mood: Bright gentle morning light, welcoming and adventurous, never ominous.
Color palette: Warm jade green, cinnabar red, cream stone, soft gold and spring foliage.
Constraints: Child-safe; culturally respectful traditional Chinese architecture; crisp silhouettes; no combat; no text; no letters; no pseudo-writing; no signs with glyphs; no logo; no watermark; no UI; no emoji; no border; no placeholder boxes.

W3 family art-direction verifier anchor: polished 3D children's storybook game.

Accepted edit prompt:
Edit the provided image only. Remove every gold marking, plaque-like symbol, pseudo-character, glyph-like ornament, or writing-like motif from the manor gate beams, columns, roof ornaments, and walls. Replace those marks with simple non-symbolic carved wood panels and subtle repeating geometric cloud curves that cannot be mistaken for letters or Chinese characters. Preserve the exact composition, camera, architecture, open foreground, spring landscape, colors, lighting, 3D children's storybook style, and all other details. No text, no letters, no pseudo-writing, no logo, no watermark, no UI.

Processing: the accepted edited built-in image_gen PNG (`exec-77ccc7c2-4559-4dd3-853e-786295a17718.png`, 1672x941 RGB) was original-resolution visually inspected before this task. Sharp 0.35.3 only technically encoded it without crop, redraw, compositing, or content edit as 1672x941 WebP (`quality: 78`, `effort: 6`, `smartSubsample: true`). The output fully decodes and hasAlpha is false as expected for a background.
```

### Prompt W3M1-002 manor message states

```text
Use case: illustration-story
Asset type: W3-M1 two-scenario character state sheet for a commercial children's coding game
Primary request: Create one polished 3D Chinese children's storybook character state sheet with two clearly separated groups for later cropping.
Scene/backdrop: Genuine transparent background with clean alpha, no floor, no scenery, no shadow rectangle, no checkerboard pattern.
Left group: Gao Cai, a friendly young manor servant in historically inspired simple Ming-era clothing, respectfully and urgently explaining that his master is seeking a capable helper to resolve a demon problem; a second pose of the same Gao Cai turning and hurrying back toward the manor to report the offer of help.
Right group: A distinct ordinary adult villager in different colors and silhouette, calm and relaxed, using an open-hand gesture to give road directions only, with no distress and no request for help; a second neutral walking-forward pose.
Style/medium: High-quality bright 3D children's storybook game characters, rounded friendly proportions, readable emotion and body language, culturally respectful, child-safe.
Composition/framing: 16:9 wide state sheet; four full-body poses with generous transparent separation; left pair and right pair visually distinct; no overlaps; consistent scale; all hands, feet, hats, and clothing fully inside canvas.
Lighting/mood: Soft warm daylight, clear friendly faces.
Color palette: Jade green, cinnabar, cream, muted blue and soft gold accents; left and right groups use clearly different dominant colors.
Constraints: Preserve one consistent identity across Gao Cai's two poses; ordinary villager must not resemble Gao Cai; no weapons; no combat; no monster; no text; no letters; no pseudo-writing; no signage; no logo; no watermark; no UI; no emoji; actual transparent alpha background.

W3 family art-direction verifier anchor: polished 3D children's storybook game.

Rejected state edits note: two later edge-cleanup imagegen edits were rejected because they baked checkerboard backgrounds and metadata showed channels=3, hasAlpha=false. Shipping source remains `exec-3500c758-71d7-46cc-b1a1-df04bcd2aadf.png` (1672x941 RGBA).

Processing: Sharp 0.35.3 only technically processed the accepted source: every alpha value was preserved; alpha-zero RGB was set to zero; each partial-alpha pixel connected to an alpha>=250 seed received that nearest seed RGB to decontaminate colored edge fringes. Opaque RGB, alpha values, composition, layout, and artwork were untouched; 949 partial-alpha pixels without an opaque seed were left unchanged. It was then encoded as 1672x941 WebP (`quality: 68`, `alphaQuality: 100`, `effort: 6`, `smartSubsample: true`). The output fully decodes, preserves hasAlpha true, and passes the W3 alpha-edge gate (0 mismatches in 44,463 measured partial-edge pixels).
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
