# arnx

Your agent writes code. arnx puts it to the test.

arnx reviews code changes with tests you can run and keep. It investigates suspected bugs, runs tests, and asks about intent. You decide what matters, give your coding agent the accepted findings, and check the fix with the same tests.

Open source under MIT. Bring your own model through supported providers and your own API keys.

See the failure. Check the fix. Keep the test.

[arnx.dev](https://arnx.dev)

The shared build step adds the standard GA4 Google tag to every page's head,
using measurement ID `G-MMZS9QVW5F` by default. Override it at build time with
`GA_MEASUREMENT_ID` (for example, `GA_MEASUREMENT_ID=G-XXXXXXXXXX npm run build`),
or set the `GA_MEASUREMENT_ID` GitHub Actions repository variable for deployment.

`src/analytics.ts` provides `trackEvent(name, params?)`, which safely skips events
when GA4 is unavailable. Existing pilot and contact CTAs emit `pilot_click` with
curated location, destination and label metadata; form values and email-link
contents are never passed to the helper. GitHub, docs and install-copy events
have no corresponding UI yet. Standard GA4 measurement remains unchanged.
