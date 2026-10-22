import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
export function serve(port = Number(process.env.PORT || 4173)) {
  const root = resolve("dist");
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css",
    ".js": "text/javascript",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".txt": "text/plain",
    ".xml": "application/xml",
  };
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let file = resolve(
        root,
        "." + (path.endsWith("/") ? path + "index.html" : path),
      );
      if (!file.startsWith(root + sep)) throw new Error("Not found");
      // Like GitHub Pages: /terms serves terms.html when there is no file "terms".
      const data = await readFile(file).catch(async (error) => {
        if (extname(file)) throw error;
        file += ".html";
        return readFile(file);
      });
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    }
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(`Local preview: http://127.0.0.1:${server.address().port}`),
  );
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) serve();
