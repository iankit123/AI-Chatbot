# Krishna "Speaking" Image Prompts (Premium / Paid Experience)

Purpose: a Krishna visual that pairs with TTS so the paid user feels *spoken to* rather than
*reading a chat log*. These prompts are written to match the existing art direction of
`client/public/images/krishna-card.png` (deep indigo → violet dusk, warm gold rim light,
peacock feather, Yamuna ghat at sunset, painterly semi-realistic Indian devotional art).

## The hard constraint that drives everything

If you ever want real lip-sync (D-ID / HeyGen / SadTalker / Wav2Lip) — or even a cheap fake
mouth animation — the source image must be **lip-sync safe**:

- Front-facing, head straight, both eyes visible, looking into the camera lens
- **Mouth closed or barely parted, teeth not visible** (lip-sync models re-draw the mouth;
  visible teeth or a wide smile produces the "melting jaw" artifact)
- Nothing crossing the face: no peacock feather over the cheek, no flute at the lips, no hand
  near the chin, no hair strand over the mouth
- Even, soft light on the face — no harsh half-shadow across one cheek
- Face occupies a large share of the frame (aim for the head being ≥ 40% of image height)
- No motion blur, no heavy film grain, no bokeh on the face

Everything below respects those rules. If you skip lip-sync and just do a glow-pulse + subtle
breathing zoom (recommended for v1 — cheaper, faster, no per-message render cost), the same
image still works.

---

## Prompt A — Primary speaking portrait (use this one)

Recommended: 1024×1024 or 1152×1152, then crop to what each surface needs.

```
A serene, painterly semi-realistic devotional portrait of Lord Krishna as a calm young
divine guide, head-and-shoulders bust framing, facing the camera straight on, making
direct gentle eye contact with the viewer.

Face: soft luminous blue-toned skin with warm undertones, gentle knowing half-smile with
lips closed, no teeth showing, calm relaxed jaw, kind expressive dark eyes with soft
highlights, delicate golden urdhva-pundra tilak on the forehead, smooth unblemished skin,
symmetrical features, fully unobstructed face.

Adornment: ornate antique-gold mukut crown with a single peacock feather rising behind and
to the side of the head (never crossing the face), gold jhumka earrings, layered gold
necklaces, a white and pink flower garland resting on the chest, saffron-gold silk uttariya
over one shoulder.

Lighting: soft warm golden rim light from behind the left shoulder, gentle even fill light
across the face, subtle divine glow around the head, no harsh shadows on the face.

Background: softly blurred deep indigo to violet twilight gradient with a faint golden
mandala halo behind the head, drifting warm light motes, distant hint of a Yamuna river
ghat at sunset, heavily out of focus so the face stays the clear subject.

Style: high-detail Indian devotional digital painting, cinematic soft focus background,
reverent and peaceful mood, warm gold and indigo palette, clean sharp face, 4k, centered
composition, head and shoulders only, portrait orientation.
```

**Negative prompt** (for SDXL/Flux; for Midjourney use `--no ...`, for Gemini/GPT-Image just
append as a sentence):

```
open mouth, visible teeth, wide grin, laughing, flute at lips, hand near face, peacock
feather over face, hair covering mouth, profile view, head tilted, looking away, closed
eyes, sunglasses, harsh shadow across face, dramatic side lighting, motion blur, film
grain, watermark, text, signature, extra fingers, deformed hands, asymmetrical eyes,
multiple faces, crowd, busy background, cartoon, anime, cheap 3d render, plastic skin,
oversaturated neon
```

**Midjourney one-liner variant:**

```
serene painterly portrait of young Lord Krishna, head and shoulders, facing camera,
direct calm eye contact, closed-lip gentle smile, luminous blue skin, golden mukut crown,
peacock feather behind head, flower garland, saffron silk, soft golden rim light, blurred
indigo-violet twilight with faint gold mandala halo, Indian devotional digital painting,
reverent peaceful mood, sharp detailed face --ar 1:1 --style raw --v 6 --no open mouth,
teeth, flute at lips, hand near face, text, watermark
```

## Prompt B — Circular chat avatar (small, 256–512px)

Used next to each spoken message / as the pulsing "speaking" orb.

Take Prompt A and swap the framing + background paragraphs for:

```
Tight head-and-neck crop, face centered and filling the frame, chin above the lower edge,
crown fully inside the frame with a small margin, flat soft indigo-violet background with
a subtle gold radial glow behind the head, no scenery, no horizon line, designed to be
masked into a circle.
```

Why: the card image is a wide landscape scene — it turns to mush at 48px. A dedicated tight
crop keeps the eyes readable in the avatar.

## Prompt C — Full-bleed "listening screen" background (9:16, mobile)

For the immersive paid mode where the screen goes dark and Krishna speaks the answer.

Take Prompt A and swap the framing + background paragraphs for:

```
Vertical 9:16 composition, Krishna positioned in the upper third of the frame, head and
upper chest visible, one open palm raised in a gentle abhaya blessing gesture at chest
height well below the face, the lower two thirds of the frame fading into a dark deep
indigo gradient with drifting golden light motes and soft lotus silhouettes, deliberately
empty and low-contrast at the bottom so white subtitle text and controls remain readable,
soft vignette at the edges.
```

Then overlay: live TTS caption text in the empty lower third, a waveform or pulsing gold
ring behind the head, and a "tap to pause" control.

---

## Making it *feel* like he is speaking (without lip-sync)

In priority order — the first three deliver ~80% of the effect for very little work:

1. **Gold aura ring driven by audio amplitude.** Feed the TTS output through
   `AnalyserNode.getByteFrequencyData` and map RMS → the ring's `scale` + `opacity`. The eye
   reads a pulsing halo synced to a voice as "he is talking."
2. **Slow breathing loop.** `transform: scale(1.0 → 1.015)` over ~4s, `ease-in-out`,
   infinite alternate. Never let the image sit perfectly still while audio plays.
3. **Word-synced captions.** Reveal the text word-by-word in time with the audio instead of
   dumping the full paragraph. This is what actually kills the "I'm reading" feeling.
4. **Occasional blink.** A second image (eyes closed) cross-faded in for 120ms every 4–7s
   at random. Cheap, and disproportionately effective at making a still feel alive.
5. **Dim the rest of the UI** while he speaks — background to near-black, only the portrait
   and the current caption lit.

For the blink frame, re-run Prompt A with `gentle knowing half-smile with lips closed` kept
identical and `kind expressive dark eyes with soft highlights` replaced by
`eyes softly closed, relaxed eyelids, serene expression` — and use the same seed so the rest
of the frame matches.

## Persona guardrail

`server/prompts/chatbots/krishna.ts` is explicit that the bot is **not literally Krishna** —
it is a guide *inspired by* Krishna. Keep the existing on-screen disclaimer visible in the
speaking mode too; a photoreal talking deity plus a hidden disclaimer is the combination that
draws complaints. Keeping the art clearly *painted/devotional* rather than photoreal is a
deliberate part of that.
