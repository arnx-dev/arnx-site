// Content pages: guides, case studies, research, comparisons and the agent page.
// Each file under src/content/ is a body fragment that starts with a JSON
// "meta" comment. The path comes from the file name, the head from the meta.
import { readdir, readFile } from "node:fs/promises";
import { origin } from "./discovery.mjs";

const root = new URL("../src/content/", import.meta.url);
export const sections = {
  agents: "For coding agents",
  guides: "Guides",
  "case-studies": "Case studies",
  research: "Research",
  compare: "Compare",
};
const kinds = ["article", "index", "page"];
const escape = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export function parseContent(file, source) {
  const match = source.match(/^<!--meta\n([\s\S]*?)\n-->\n/);
  if (!match) throw new Error(`${file}: missing meta comment`);
  const meta = JSON.parse(match[1]);
  for (const field of ["title", "description", "summary", "crumb", "updated"])
    if (!meta[field]?.trim())
      throw new Error(`${file}: meta.${field} required`);
  if (!kinds.includes(meta.kind)) throw new Error(`${file}: meta.kind`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.updated))
    throw new Error(`${file}: meta.updated must be a date`);
  if (meta.description.length < 70 || meta.description.length > 170)
    throw new Error(
      `${file}: description is ${meta.description.length} characters (70 to 170)`,
    );
  if (meta.title.length > 70) throw new Error(`${file}: title over 70`);
  const slug = file
    .replaceAll("\\", "/")
    .replace(/(^|\/)index\.html$/, "$1")
    .replace(/\.html$/, "/");
  const section = slug.split("/")[0];
  if (!sections[section]) throw new Error(`${file}: unknown section`);
  const body = source.slice(match[0].length);
  if ((body.match(/<h1(?:\s[^>]*)?>/g) || []).length !== 1)
    throw new Error(`${file}: exactly one h1`);
  return {
    ...meta,
    section,
    path: `/${slug}`,
    file: `${slug}index.html`,
    canonical: `${origin}/${slug}`,
    body,
  };
}

export async function loadContent() {
  const files = (await readdir(root, { recursive: true }))
    .filter((file) => file.endsWith(".html"))
    .sort();
  const pages = [];
  for (const file of files)
    pages.push(parseContent(file, await readFile(new URL(file, root), "utf8")));
  return pages;
}
export const content = await loadContent();

// Pages listed under an index page, in the order given by meta.order.
export function children(page, all = content) {
  return all
    .filter(
      (other) =>
        other.section === page.section &&
        other.path !== page.path &&
        other.kind !== "index",
    )
    .sort(
      (a, b) =>
        (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title),
    );
}

export function breadcrumbs(page) {
  const trail = [{ name: "arnx", url: `${origin}/` }];
  const sectionPath = `/${page.section}/`;
  if (page.path !== sectionPath)
    trail.push({ name: sections[page.section], url: origin + sectionPath });
  trail.push({ name: page.crumb, url: page.canonical });
  return trail;
}

export function contentSchemas(page, release) {
  const trail = breadcrumbs(page);
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: trail.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    },
  ];
  if (page.kind === "article")
    schemas.push({
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: page.title.replace(/ \| arnx$/, ""),
      description: page.description,
      url: page.canonical,
      mainEntityOfPage: page.canonical,
      datePublished: page.published || page.updated,
      dateModified: page.updated,
      inLanguage: "en",
      author: { "@id": `${origin}/#organization` },
      publisher: { "@id": `${origin}/#organization` },
      about: { "@id": `${origin}/#software` },
      isPartOf: { "@type": "WebSite", name: "arnx", url: `${origin}/` },
      ...(release?.cli?.version
        ? { dependencies: `arnx ${release.cli.version}` }
        : {}),
    });
  return schemas;
}

export function renderContentPage(page, all = content) {
  const trail = breadcrumbs(page);
  const crumbs = trail
    .map((item, index) =>
      index === trail.length - 1
        ? `<span aria-current="page">${escape(item.name)}</span>`
        : `<a href="${escape(new URL(item.url).pathname)}">${escape(item.name)}</a>`,
    )
    .join('<span aria-hidden="true"> / </span>');
  const list = children(page, all)
    .map(
      (child) =>
        `<li><a href="${child.path}">${escape(child.listTitle || child.title.replace(/ \| arnx$/, ""))}</a><p>${escape(child.summary)}</p></li>`,
    )
    .join("");
  // A scrolling table must be reachable by keyboard.
  const body = page.body
    .replaceAll("{{CHILDREN}}", `<ul class="page-list">${list}</ul>`)
    .replaceAll(
      '<div class="table-scroll">',
      '<div class="table-scroll" tabindex="0" role="region" aria-label="Table">',
    );
  const reviewed =
    page.kind === "article"
      ? `<p class="scope-note article-reviewed">Last reviewed ${escape(page.updated)} against arnx {{CLI_VERSION}}. {{CANONICAL_DOCS}}</p>`
      : "";
  const title = escape(page.title);
  const description = escape(page.description);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#faf8f3" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${page.canonical}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${page.canonical}" />
    <meta property="og:image" content="${origin}/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="arnx: Test your change. Keep the evidence." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${origin}/og.png" />
    <meta name="twitter:image:alt" content="arnx: Test your change. Keep the evidence." />
    <link rel="icon" type="image/svg+xml" href="/brand/arnx-favicon.svg" />
    <link rel="stylesheet" href="/assets/styles.css" />
    <script type="module" src="/assets/app.js"></script>
  </head>
  <body>
    {{HEADER}}
    <main id="main" class="case-article wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">${crumbs}</nav>
${body}
      ${reviewed}
    </main>
    {{FOOTER}}
  </body>
</html>
`;
}

// Shared partials use page-relative links for the flat pages; nested pages
// need the same links from the site root.
export const rootLinks = (html) =>
  html.replaceAll('href="./', 'href="/').replaceAll('src="./', 'src="/');

const entities = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};
const decode = (text) =>
  text.replace(/&(?:amp|lt|gt|quot|nbsp|#39);/g, (entity) => entities[entity]);

// A small HTML to Markdown pass for llms-full.txt. It handles the elements the
// site's articles use; anything else is reduced to its text.
export function toMarkdown(html, base) {
  const blocks = [];
  let text = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html)
    .replace(/<(script|style|button|svg)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
      blocks.push(decode(code.replace(/<[^>]+>/g, "")).replace(/\s+$/, ""));
      return `\n\n@@BLOCK${blocks.length - 1}@@\n\n`;
    })
    .replace(/\s+/g, " ")
    .replace(/<\/(\w+)\s+>/g, "</$1>")
    .replace(
      /<h([1-4])\b[^>]*>(.*?)<\/h\1>/gi,
      (_, level, inner) =>
        `\n\n${"#".repeat(Number(level) + 1)} ${inner.replace(/<br\s*\/?>/gi, " ")}\n\n`,
    )
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_, href, inner) =>
      href.startsWith("mailto:")
        ? inner
        : `[${inner.replace(/<[^>]+>/g, "").trim()}](${new URL(href, base).href})`,
    )
    .replace(/<code\b[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<(strong|b)\b[^>]*>(.*?)<\/\1>/gi, "**$2**")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/t[hd]>\s*<t[hd]\b[^>]*>/gi, " | ")
    .replace(/<tr\b[^>]*>/gi, "\n")
    .replace(/<dt\b[^>]*>/gi, "\n\n**")
    .replace(/<\/dt>/gi, "**\n")
    .replace(
      /<\/?(p|div|section|article|ul|ol|table|thead|tbody|caption|dl|dd|blockquote|header|footer)\b[^>]*>/gi,
      "\n\n",
    )
    .replace(/<[^>]+>/g, "");
  text = decode(text)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\[([^\]]*?) ↗\]/g, "[$1]")
    .trim();
  return text.replace(
    /@@BLOCK(\d+)@@/g,
    (_, index) => "```\n" + blocks[Number(index)] + "\n```",
  );
}
