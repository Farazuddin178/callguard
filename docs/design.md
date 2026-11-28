# Stage 5 design notes

- Kage and Sylva share a typography adapter, but their recipes set independent heading scales, weights and spacing. Give CallGuard a large display line and a quieter reading line in the same family, with room for Hindi and Telugu vowel signs.
- The landing page entry points for Kage, Sylva, Complete Shelf and Meng To Sketchbook select distinct iframe scenes. Complete Shelf exposes its own book title and body sizing in the recipe. Borrow that object-led composition by giving a single working phone the weight of a product photograph.
- EditorialIntroSection puts a device and its copy in separate, unequal areas. Keep the hero copy on a clear left edge and give the phone room to occupy the right side.
- NewsletterFooterSection changes scale and alignment across its form, masthead and legal row. Use one oversized wordmark beside an ordinary link list, and give the facts and help sections their own typographic rhythms.
- TactileButton and SkeuomorphicToggle use press depth and a physical change of position. Carry this through to the phone bezel, speaker control and buttons with visible state changes and a short press response.
- PerformanceGauges, AudioWordmark, GalleryHeading and TextAnimationCollection give different interactions distinct visual jobs. In CallGuard the needle tracks real rule scores, speech appears in sequence, and one shake marks the warning.
- SparkBadge and SemanticBloom observe visibility before running their effects. Apply the same resource restraint to the phone tilt, and use observations of the four story beats to change one pinned screen. Keep a static, readable story for reduced motion.

## Review checklist

- [x] The hero uses short localized headlines and a handset with the shared risk meter, transcript highlights and warning components. Script checks exercise the safe bank call at every turn.
- [x] The landing uses a pinned handset story, a guide strip, a conversational quiz, three lines of privacy copy, a statistics row, a help band and a ruled FAQ.
- [x] The CSS uses Anek subsets, Phosphor regular, cobalt action controls, light and dark palettes and shared corner tokens. Risk colors identify results and warnings, and the simulated incoming call uses the requested green answer control.
- [x] Reviewed the three locales and added checks for long dashes, banned wording, six-word guide captions and short introductions. The install labels follow Android Chrome and iPhone Safari help. [Google Chrome Help](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en-G), [Apple Support](https://support.apple.com/en-az/guide/iphone/iphea86e5236/26/ios/26)
- [x] Source review confirms 20px reading text or larger on screen, 56px targets and 64px guide navigation. Calculated text contrast is 10.65:1 for white on the red warning and 12.16:1 on its light helpline button.
- [x] The revised unminified app-shell build measured 1,858,300 bytes of precache. It includes the WOFF2 subsets, guide, game and static contour image. WASM, the speech worker, sample audio and live hero effects stay outside the precache.
- [x] Read all 22 reviewer captures. The first Stage 5 build passed Chromium and the A4 print test. The mobile guide screenshot still showed letter breaks in the dial buttons and separated its navigation. The large desktop capture also showed a small handset in a low-contrast grey panel.
- [x] The revision puts dialer labels under the icons at whole-word breaks. Mobile guide navigation occupies one fixed row with progress above it. Mobile how-to uses a single swipeable frame. The typography checks cover each locale and use the handset's transformed size.
- [x] The revised hero uses ThreeUI Community's `RibbonFieldBackground` for a slow, tinted field. Call state controls the tint. A local WebP keeps the composition when effects are disabled, and the entrance and ring signal use opacity and transform. The 1440px capture checks handset height.
- [x] Re-read the localized copy. The quiz, text checker, waveform band and language samples have separate compositions. Header utilities and the privacy link are in their respective sections.
- [x] The second review approved the 1440px hero and mobile picture guide. It found a mobile language-picker viewport failure, three screenshot timeouts and a small desktop story handset in a grey panel.
- [x] The final adjustments put a compact language picker in the mobile header, give the desktop story a larger unframed handset and shorten its steps. The screenshot suite separates full landing, first-screen and clip captures.
- [x] The third review accepted the mobile hero captures and passed all 30 screenshot cases. The Telugu language picker still clipped in the 1280 × 720 desktop viewport.
- [ ] Verify the single header language picker in Chromium and review the enlarged desktop story handset. The last approved screenshot set predates these two changes.
