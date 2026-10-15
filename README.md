# arnx landing page

Static, accessible landing page for GitHub Pages. Plain semantic HTML, CSS and a small TypeScript enhancement script; esbuild bundles locally hosted Inter and JetBrains Mono fonts. No client framework or runtime dependencies.

## Local development

Requires Node 22.18 or newer.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173. Re-run after edits. `npm run build` creates `dist`; `npm run preview` serves it. All asset and page URLs are relative, supporting both a Pages project subpath and a custom domain.

```sh
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Browser checks start their own server, test mobile/desktop, navigation, FAQ, copy, form success/failure and accessibility. Email calls are mocked; tests never send mail. Set `PLAYWRIGHT_EXECUTABLE_PATH` to use a local Chromium installation.

## Published files

The build uses an explicit allowlist: two public HTML pages, bundled CSS/JS/fonts, font licenses, the custom-domain file and four selected brand assets. It does not copy `public/` wholesale. Only `dist/` is deployed; tests and the optional form Worker are source files, not Pages content.

## GitHub Pages and arnx.dev

`.github/workflows/pages.yml` checks and deploys pushes to `main`; it can also be run manually. Enable Pages with **GitHub Actions** as the source. Set the custom domain to `arnx.dev` in Pages settings (the build also includes `CNAME`). Enable HTTPS once GitHub has issued the certificate.

For Cloudflare DNS, use DNS-only records while GitHub verifies the domain and provisions HTTPS:

| Type  | Name | Target             |
| ----- | ---- | ------------------ |
| A     | @    | 185.199.108.153    |
| A     | @    | 185.199.109.153    |
| A     | @    | 185.199.110.153    |
| A     | @    | 185.199.111.153    |
| CNAME | www  | arnx-dev.github.io |

Replace conflicting web-hosting A/AAAA/CNAME records only. Preserve email MX and TXT records. The CNAME target contains no repository path. GitHub recommends verifying the domain in the organization's Pages settings with its generated TXT record.

Add the optional repository variable `PILOT_ENDPOINT` once the form Worker is deployed. It is a public HTTPS URL, never an API key. Without it, the site offers the email fallback.

[GitHub custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Pilot form

The page includes an email/project form and a direct `info@arnx.dev` email link. Without a configured endpoint, submission offers a prefilled email link and explicitly says online requests are not connected. It never pretends to store a request.

GitHub Pages cannot run server code. `worker/index.ts` is a separate Cloudflare Worker using Resend's HTTP API. It only sends to the configured owner inbox; the visitor address is the reply-to, not a sending recipient. It checks origin, content type, body size and input, rejects honeypot submissions, rate-limits and uses an idempotency key for retries. Limits are per Cloudflare location, not a global quota.

Configure the Worker separately:

1. Review `worker/wrangler.jsonc`: owner inbox is `info@arnx.dev`; allow only actual website origins. Choose an unused rate-limit namespace in your Cloudflare account.
2. Verify your sending domain with Resend.
3. Set `RESEND_API_KEY` and `RESEND_FROM` as Worker secrets using Wrangler's interactive secret commands. Never put the key in Git, GitHub Pages variables or the browser bundle.
4. Deploy the Worker with Wrangler using `worker/wrangler.jsonc`.
5. Set the GitHub repository variable `PILOT_ENDPOINT` to the deployed HTTPS URL ending in `/pilot`, then rebuild Pages.
6. Verify delivery to the owner inbox before public launch. No live email has been sent during automated verification.

References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [Cloudflare rate-limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

No analytics, cookies or automatic visitor confirmation emails are included. Submission data goes through the configured Worker and Resend to the owner inbox. Fonts are self-hosted with their OFL licenses in the build.

## License

Site source: MIT. Inter and JetBrains Mono retain their bundled OFL licenses.
