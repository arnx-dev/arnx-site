# Initial-load performance audit

Measured 2026-10-17 against the local production build, before and after this change.
No layout, CSS, typography, colors, content, or image placement was changed.

## Image delivery

All original mascots are 1254 × 1254 pixels. Browser-measured CSS dimensions:

| Mascot      | Desktop ≥1060 px | Tablet 761–1059 px | Mobile ≤760 px |
| ----------- | ---------------- | ------------------ | -------------- |
| Inspecting  | 430 × 430        | 310 × 310          | 320 × 320      |
| Questioning | 165 × 165        | 165 × 165          | 100 × 100      |
| Green check | 190 × 190        | 190 × 190          | Hidden         |

Responsive WebP files preserve transparency, square canvas, and artwork. They use
Lanczos resizing and quality 90; originals remain available for regeneration but
are no longer shipped in `dist`. WebP provides a single broadly supported delivery
format; AVIF was not needed to achieve the reduction below. The highest hero
candidate retains the original resolution for dense desktop displays.

All sizes below are KiB (1024 bytes):

| Mascot      | Original PNG | Generated WebP variants                                                               |
| ----------- | -----------: | ------------------------------------------------------------------------------------- |
| inspecting  |        901.5 | 320 px: 15.9, 430 px: 26.5, 640 px: 54.0, 860 px: 95.2, 960 px: 115.6, 1254 px: 175.7 |
| questioning |        753.8 | 100 px: 2.8, 165 px: 5.3, 200 px: 6.9, 330 px: 15.2, 495 px: 31.3                     |
| greencheck  |        893.0 | 190 px: 7.8, 380 px: 21.6, 570 px: 42.9                                               |

`srcset` and `sizes` match the CSS breakpoints. Existing explicit width/height
attributes preserve the 1:1 aspect ratio. Only the hero has high fetch priority;
other mascots remain native lazy-loaded. Images use asynchronous decoding. The
hero stays eager because it is the desktop LCP image; on narrow mobile screens
it is below the initial viewport, but now downloads a much smaller resource.
The hidden mobile green-check stays lazy and is not normally requested.

The 42 KiB social `og.png` remains PNG for social preview compatibility; browsers
do not fetch it during page rendering. The favicon is already a 557-byte SVG.

## Page weight

Measured resource body sizes, including HTML, CSS, JS, requested fonts, images,
and favicon. These are **first-party uncompressed payloads**, not Internet wire
transfer totals: the local server does not gzip/Brotli text. Analytics and the
live edge-injected script are excluded. The full-image measurement deliberately
forces all images to load, including the hidden mobile image, for a consistent
upper bound. Normal mobile scrolling therefore uses less than that upper bound.

| Viewport / pixel density | Initial before | Initial after | All images before | All images after |
| ------------------------ | -------------: | ------------: | ----------------: | ---------------: |
| 1440 px / 1×             |     1044.0 KiB |     170.5 KiB |        2690.8 KiB |        183.6 KiB |
| 1440 px / 2×             |     1044.0 KiB |     239.2 KiB |        2690.8 KiB |        276.0 KiB |
| 390 px / 3×              |     1044.0 KiB |     259.5 KiB |        2690.8 KiB |        317.6 KiB |
| 768 px / 2×              |     1044.0 KiB |     198.0 KiB |        2690.8 KiB |        234.8 KiB |

Desktop 1×: initial payload reduced **83.7%**, full-image payload **93.2%**.
Desktop 2×: initial payload reduced **77.1%**, full-image payload **89.7%**.

Largest resources before: inspecting PNG 901.5 KiB, green-check PNG 893.0 KiB,
questioning PNG 753.8 KiB. After, desktop 1×: Inter 47.1 KiB, JetBrains Mono
39.5 KiB, HTML 28.3 KiB, hero WebP 26.5 KiB, CSS 25.0 KiB. Desktop 2× hero is
95.2 KiB; mobile 3× hero is 115.6 KiB. The largest available variant is the
1254 px hero (175.6 KiB), requested only when selected by the browser.

## Fonts, blocking work, and third parties

- Two self-hosted variable WOFF2 font files actually load: Inter 48,256 bytes
  and JetBrains Mono 40,404 bytes. There are no separate unused weight requests.
  Fractional weights such as 450, 550, 650, and 740 are intentional; reducing
  these to static regular/bold faces would change the design. Other Unicode
  subset files exist in the build but do not load for this page.
- One minified stylesheet (25,631 bytes) is render-blocking as required for
  styled first paint. It remains intact to avoid flashes or layout changes.
  Font faces already use `font-display: swap`.
- App JS is 3,638 bytes, bundled, and loaded as a deferred module. No framework
  runtime or extra JS dependency downloads were found.
- GA4 previously began downloading directly from the head. Configuration and
  events now queue immediately, with the async tag download 1.5 seconds after
  `window.load`. This reduces early network and main-thread competition; it
  does not eliminate the eventual analytics payload. Very brief visits may
  leave before analytics loads and consequently be uncounted.
- No external font, embed, video, or image service requests are needed.

## Expected LCP effect

At 1440 × 1000 the browser identifies the inspecting mascot as LCP. Its selected
payload drops from 923,128 bytes to 27,172 bytes at 1× (97.1% less), or 97,528 bytes
at 2× (89.4% less). At an illustrative 1.6 Mbit/s, the byte reduction alone removes
roughly 4.5 seconds / 4.1 seconds of serial transfer demand, respectively. This
is **not a predicted or measured LCP improvement**: request overlap, throughput,
cache, font loading, CPU and server response all affect the actual timing.

At 390 × 844 the headline is LCP, not the mascot. Mobile benefits from less image
bandwidth competition and delayed analytics, but text/font delivery and document
TTFB remain its more direct LCP dependencies. Local unthrottled LCP timings are
not used to claim a production speedup. Recheck field data after deployment.

## Hosting/network observations

The live HTML response was HTTP 200 with GitHub/Fastly headers behind Cloudflare:
`server: cloudflare`, `x-github-edge-region: brazilsouth`, `x-cache: HIT`,
`cf-cache-status: DYNAMIC`, and `cache-control: max-age=600`. Cloudflare also injects
`/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js`, which is absent
from the static source. That same-origin request and its execution remain an
edge configuration concern; no infrastructure settings were changed.

Two public fetches took 20.15 and 19.49 seconds to first byte. On the repeat,
DNS completed at 0.020 seconds, connection at 0.029 seconds, and TLS at 0.079
seconds; the compressed HTML response was 7,774 bytes. These are observations
from this environment, not evidence of typical user latency or a GitHub origin delay.
DNS, connection/TLS, proxy/edge behavior and document TTFB are unaffected by image
conversion. The local audit excludes edge injection and eventual GA4 traffic,
so it must not be presented as the full live network transfer total.

## Verification and reproduction

- Unit/build tests, lint, TypeScript, and browser regression tests pass.
- Browser tests cover five widths (320, 390, 768, 1024, 1440), WCAG AA axe checks,
  navigation, forms, copy, analytics events, and the case-study page.
- Before/after screenshots at four viewport/density combinations have identical
  page dimensions. Rendered image boxes are unchanged; visual inspection confirms
  the hero retains its texture and transparent edges. Pixel differences come from
  image resampling/compression, not a design change.
- Run `npm run build`, then
  `PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/google-chrome node scripts/audit-performance.mjs after`.
  JSON resource measurements and screenshots are written to ignored
  `artifacts/performance/`. The audit stubs external responses and does not measure
  real analytics payloads. Run against a baseline checkout for comparison.
- Regenerate committed WebP assets with `python3 scripts/optimize-images.py`
  using Pillow with WebP support. Normal builds need no image encoder.

Changes are local; deployment and production field verification remain outstanding.
