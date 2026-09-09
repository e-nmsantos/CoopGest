import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(process.env.E2E_DIST_DIR || join(tmpdir(), "coopgest-e2e-dist"));
const host = process.env.E2E_HOST || "127.0.0.1";
const port = Number(process.env.E2E_PORT || "5173");
const apiHost = process.env.E2E_API_HOST || "127.0.0.1";
const apiPort = Number(process.env.E2E_API_PORT || "8000");

if (!existsSync(join(root, "index.html"))) {
  throw new Error(`E2E dist not found: ${root}`);
}

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function resolveRequestPath(url) {
  const parsed = new URL(url || "/", `http://${host}:${port}`);
  const decoded = decodeURIComponent(parsed.pathname);
  const candidate = normalize(join(root, decoded));
  if (!candidate.startsWith(root + sep) && candidate !== root) {
    return join(root, "index.html");
  }
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }
  return join(root, "index.html");
}

const server = createServer((request, response) => {
  if ((request.url || "").startsWith("/api/")) {
    const proxy = httpRequest(
      {
        hostname: apiHost,
        port: apiPort,
        path: request.url,
        method: request.method,
        headers: request.headers,
      },
      (apiResponse) => {
        response.writeHead(apiResponse.statusCode || 502, apiResponse.headers);
        apiResponse.pipe(response);
      },
    );
    proxy.on("error", () => {
      response.statusCode = 502;
      response.end("Backend unavailable");
    });
    request.pipe(proxy);
    return;
  }

  const file = resolveRequestPath(request.url);
  const type = mimeTypes.get(extname(file).toLowerCase()) || "application/octet-stream";
  response.setHeader("Content-Type", type);
  createReadStream(file)
    .on("error", () => {
      response.statusCode = 404;
      response.end("Not found");
    })
    .pipe(response);
});

server.listen(port, host, () => {
  console.log(`E2E static server running at http://${host}:${port}`);
});
