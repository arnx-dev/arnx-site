# Search and agent discovery

What the site does so developers and coding agents can find arnx, and what only the maintainer can do. Checked on
2026-11-12 against each vendor's own documentation.

## What the build produces

- Static HTML for every page: no page needs JavaScript to be read.
- One canonical URL, title and description per page; Open Graph and Twitter card tags.
- `sitemap.xml` with every public page, `robots.txt` from `src/crawlers.json`.
- JSON-LD: `WebPage` on every page; `SoftwareApplication` and `Organization` on the home page; `BreadcrumbList` on
  content pages; `TechArticle` on guides, case studies, research and comparisons.
- `llms.txt` in the llmstxt.org format (H1, blockquote summary, link lists, an `Optional` section) and
  `llms-full.txt`, the same pages as one Markdown file. Both are generated from the pages; nothing is kept by hand.
  `llms-full.txt` is a community convention, not part of the llms.txt proposal. Neither file changes search ranking
  or any model's training data.

`npm run verify:discovery` checks all of this on a local build, or on the live site with
`npm run verify:discovery -- https://arnx.dev`.

## Crawlers

`robots.txt` allows everything (`User-agent: *`, `Allow: /`). That covers the search and user-requested fetchers:
Googlebot, bingbot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot and Perplexity-User.
The discovery check requests every page as each of them.

Training is a separate decision, kept in `src/crawlers.json`: GPTBot, ClaudeBot, Google-Extended and CCBot are all set
to `allow`, as before. Changing one to `disallow` does not affect search: Google states that Google-Extended "does not
impact a site's inclusion in Google Search", and OpenAI and Anthropic document their search and training agents as
separate tokens. Bing has no robots token for this; it reads `NOARCHIVE` and `NOCACHE` meta tags, which the site does
not set.

## Maintainer actions

None of these was done. Each needs an account only the owner has.

1. **Google Search Console.** Add `arnx.dev` as a Domain property and verify with the DNS TXT record Google shows
   (the only method for a Domain property). Then submit `https://arnx.dev/sitemap.xml`.
2. **Bing Webmaster Tools.** Import the verified property from Search Console, or verify with a DNS CNAME record.
   Submit the same sitemap.
3. **IndexNow** (Bing, Yandex, Seznam, Naver and others; not Google). Generate a key of 8 to 128 letters, digits or
   hyphens, set it as the repository variable `INDEXNOW_KEY`, and deploy: the build then writes `/<key>.txt`. After
   the deployment, `INDEXNOW_KEY=<key> node scripts/indexnow.mjs` submits the sitemap's URLs. Without the variable
   nothing is written and nothing is sent.
4. **Context7.** Add the CLI repository at context7.com/add-library (GitHub tab, `arnx-dev/arnx`). To control what it
   indexes, commit this as `context7.json` in the root of `arnx-dev/arnx`, on the default branch:

   ```json
   {
     "$schema": "https://context7.com/schema/context7.json",
     "projectTitle": "arnx",
     "description": "Open-source AI code review CLI for coding agents: writes and runs tests for suspected bugs in Docker and keeps accepted ones as regression checks.",
     "excludeFolders": ["src", "tests", "scripts", "assets"],
     "rules": [
       "Run `arnx review` once per finished change, after telling the user the budget (`review_usd`, default 3.0 USD).",
       "Never run `arnx init`, `arnx setup`, `arnx triage`, `arnx accept` or any login for the user.",
       "Never edit accepted tests under `.arnx/tests/` or `.arnx/accepted-tests.json`.",
       "`arnx check` runs accepted tests with no model calls."
     ]
   }
   ```

   To claim the library, open its `/admin` page on context7.com, copy the `url` and `public_key` it shows into that
   file, and confirm. The website or `https://arnx.dev/llms.txt` can be added as a second source in the same way.

5. **Skills directories.** `npx skills add arnx-dev/arnx` already works (checked with skills 1.8.1). Listing on a
   directory site, if wanted, is a submission from the owner's account.

## After each arnx release

1. Read the new release's README and docs against the site copy.
2. Update `src/release.json` and the version in `package.json`.
3. `npm run verify:release` (compares the site with npm and GitHub), then `npm test`.
4. Update the "Last reviewed" dates of the content pages you rechecked (`updated` in each file's meta).
