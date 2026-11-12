# Image Forensic Final Report

## Root Cause

1. **Source Resolution Bottleneck**: The untouched Argon original assets in `public/assets/*.png` (`48x48` transaction marks, `72x72` avatar, `76x68` / `80x68` product thumbnails, `108x68` peeking cat, `96x180` / `136x180` skylines, `216x204` / `236x176` / `248x196` / `344x348` cat cards, `1276x340` hero banner) were inherently low-resolution bitmaps with baked-in anti-aliasing. Even when CSS `renderScale <= 1.0`, displaying a 1x low-res raster without vector geometry or high-DPI source density left blurred outlines and soft edges at 100% browser zoom.
2. **Intermediate Fidelity Issues Corrected During Forensic Audit**:
   - Early AI reconstruction (`gemini-3.1-flash-image`) produced soft edges on `rewards_art` and `ai_cat` from 1024px JPEG output before hitting API quota exhaustion (`429 RESOURCE_EXHAUSTED`).
   - Initial vector paths for `rewards_art.svg` placed the cat overlapping the gift-box bow with a reversed paw curve, `ai_cat.svg` sat too upright, and `hero_bg.svg` used thin monoline strokes for `Dream bigger with PayPal ♥`. Side-by-side 4x comparison against the backed-up original Argon PNGs caught and fixed all three.
   - No SVG in `public/assets/*.svg` contains embedded `<image>`, `data:image`, `feGaussianBlur`, or filter effects; no React component or ancestor applies `filter: blur()`, `mix-blend-mode`, `opacity` wash, or `transform: scale()` to active artwork.

## Evidence

- **Browser Viewport**: `1920x1080`
- **Screenshot Dimensions**: `1920x1080` (1:1 pixel match, zero QA screenshot scaling)
- **Device Pixel Ratio (`dpr`)**: `1`
- **Browser Zoom**: `100%`
- **SVG Integrity Check (`public/assets/*.svg`)**: `0` embedded rasters (`<image` / `data:image`), `0` SVG blur filters (`feGaussianBlur` / `filter=`)
- **CSS / Ancestor Check**: `0` `filter: blur`, `0` `mix-blend-mode`, `0` unintended transforms/opacity on image elements or ancestors
- **Runtime Totals (`qa_v3_verify.py`)**: `13/13` viewports (`2560x1440` through `390x844`) PASS, `19/19` routes PASS, `0` broken images, `0` upscaled images, `0` horizontal overflows, `0` console/page/network errors

## Asset-by-Asset Result

| Asset | Original | Current | Root Cause | Fix | Sharp? |
| --- | --- | --- | --- | --- | --- |
| `hero_bg.png` | `1276x340` | `/assets/hero_bg.svg` (5104x1360 vector SVG (infinite DPI), CSS `1192x309.03`) | Original `1276x340` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`vector_svg + 5104x1360 PNG mirror`, scaling `1x`/fit `contain`, filter `none`, ancestors `0`) | YES |
| `sidebar_cat.png` | `236x176` | `/assets/sidebar_cat.svg` (2360x1760 vector SVG (infinite DPI), CSS `236x176`) | Original `236x176` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`vector_svg + 2360x1760 PNG mirror`, scaling `1x`/fit `contain`, filter `none`, ancestors `0`) | YES |
| `spending_cat.png` | `108x68` | `/assets/spending_cat.svg` (1080x680 vector SVG (infinite DPI), CSS `108x68`) | Original `108x68` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`vector_svg + 1080x680 PNG mirror`, scaling `1x`/fit `contain`, filter `none`, ancestors `0`) | YES |
| `rewards_art.png` | `344x348` | `/assets/rewards_art.svg` (2064x2088 vector SVG (infinite DPI), CSS `326x330`) | Original `344x348` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`vector_svg + 2064x2088 PNG mirror`, scaling `1x`/fit `contain`, filter `none`, ancestors `0`) | YES |
| `ai_cat.png` | `248x196` | `/assets/ai_cat.svg` (2480x1960 vector SVG (infinite DPI), CSS `248x196`) | Original `248x196` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`vector_svg + 2480x1960 PNG mirror`, scaling `1x`/fit `contain`, filter `none`, ancestors `0`) | YES |
| `agents_cat.png` | `216x204` | `/assets/agents_cat.svg` (2160x2040 vector SVG (infinite DPI), CSS `216x204`) | Original `216x204` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`vector_svg + 2160x2040 PNG mirror`, scaling `1x`/fit `contain`, filter `none`, ancestors `0`) | YES |
| `avatar_cat.png` | `72x72` | `/assets/avatar_cat.svg` (1024x1024 vector SVG (infinite DPI), CSS `36x36`) | Original `72x72` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`vector_svg + 1024x1024 PNG mirror`, scaling `1x`/fit `cover`, filter `none`, ancestors `0`) | YES |
| `fraudguard_skyline.png` | `136x180` | `/assets/fraudguard_skyline.svg` (544x720 vector SVG (infinite DPI), CSS `136x180`) | Original `136x180` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`true_vector_svg`, scaling `1x`/fit `contain`, filter `none`, ancestors `0`) | YES |
| `agents_skyline.png` | `96x180` | `/assets/agents_skyline.svg` (384x720 vector SVG (infinite DPI), CSS `96x180`) | Original `96x180` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`true_vector_svg`, scaling `1x`/fit `contain`, filter `none`, ancestors `0`) | YES |
| `prod_laptop.png` | `80x68` | `/assets/prod_laptop.svg` (1280x1088 vector SVG (infinite DPI), CSS `80x68`) | Original `80x68` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`true_vector_svg + 1280x1088 PNG mirror`, scaling `1x`/fit `contain`, filter `none`, ancestors `0`) | YES |
| `prod_headphones.png` | `76x68` | `/assets/prod_headphones.svg` (1216x1088 vector SVG (infinite DPI), CSS `80x68`) | Original `76x68` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`true_vector_svg + 1216x1088 PNG mirror`, scaling `1x`/fit `contain`, filter `none`, ancestors `0`) | YES |
| `prod_watch.png` | `80x68` | `/assets/prod_watch.svg` (1280x1088 vector SVG (infinite DPI), CSS `80x68`) | Original `80x68` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`true_vector_svg + 1280x1088 PNG mirror`, scaling `1x`/fit `contain`, filter `none`, ancestors `0`) | YES |
| `tx_steam.png` | `48x48` | `/assets/tx_steam.svg` (192x192 vector SVG (infinite DPI), CSS `36x36`) | Original `48x48` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`true_vector_svg`, scaling `1x`/fit `cover`, filter `none`, ancestors `0`) | YES |
| `tx_netflix.png` | `48x48` | `/assets/tx_netflix.svg` (192x192 vector SVG (infinite DPI), CSS `36x36`) | Original `48x48` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`true_vector_svg`, scaling `1x`/fit `cover`, filter `none`, ancestors `0`) | YES |
| `tx_apple.png` | `48x48` | `/assets/tx_apple.svg` (192x192 vector SVG (infinite DPI), CSS `inline_svg (36x36 / 48x48)`) | Original `48x48` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`inline_svg_and_vector_svg`, scaling `1x`/fit `inline-svg`, filter `none`, ancestors `0`) | YES |
| `tx_paypal.png` | `48x48` | `/assets/tx_paypal.svg` (192x192 vector SVG (infinite DPI), CSS `inline_svg (36x36 / 48x48)`) | Original `48x48` low-res raster with baked-in AA | Pure vector SVG + faithful Argon path refinement (`inline_svg_and_vector_svg`, scaling `1x`/fit `inline-svg`, filter `none`, ancestors `0`) | YES |

## Before / After

Side-by-side 1x, 2x, and 4x standalone sheets (untouched original Argon PNG left vs vector SVG right on identical background) plus React rendered screenshots (`1440x900`, `1920x1080`, `2560x1440`) and 400% live crops:

- **Hero**: [cmp_hero_bg_4x.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/forensic_sheets/cmp_hero_bg_4x.png) | [4x_hero_bg.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/sharpness_crops/4x_hero_bg.png)
- **Rewards**: [cmp_rewards_art_4x.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/forensic_sheets/cmp_rewards_art_4x.png) | [4x_rewards_art.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/sharpness_crops/4x_rewards_art.png)
- **AI Shopping**: [cmp_ai_cat_4x.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/forensic_sheets/cmp_ai_cat_4x.png) | [4x_ai_cat.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/sharpness_crops/4x_ai_cat.png)
- **Sidebar**: [cmp_sidebar_cat_4x.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/forensic_sheets/cmp_sidebar_cat_4x.png) | [4x_sidebar_cat.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/sharpness_crops/4x_sidebar_cat.png)
- **Agents**: [cmp_agents_cat_4x.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/forensic_sheets/cmp_agents_cat_4x.png) | [4x_agents_cat.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/sharpness_crops/4x_agents_cat.png)
- **Spending**: [cmp_spending_cat_4x.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/forensic_sheets/cmp_spending_cat_4x.png) | [4x_spending_cat.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/sharpness_crops/4x_spending_cat.png)
- **Products & Transaction Icons**: [4x_prod_laptop.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/sharpness_crops/4x_prod_laptop.png) | [4x_tx_steam.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/sharpness_crops/4x_tx_steam.png) | [4x_avatar_cat.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/sharpness_crops/4x_avatar_cat.png)
- **Full Dashboard Viewports (100% Zoom)**: [vp_1440x900.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/qa_v3/vp_1440x900.png) | [react_1920x1080.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/forensic_sheets/react_1920x1080.png) | [vp_2560x1440.png](file:///C:/Users/Dharshan/.gemini/antigravity/brain/1da2b322-f339-42e8-9a63-f6efd0f5321c/scratch/qa_v3/vp_2560x1440.png)

## Final Verdict

PASS — VISUALLY CRISP AND FAITHFUL
