const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicDir = fs.existsSync(path.join(root, "dist", "index.html")) ? path.join(root, "dist") : path.join(root, "src");
const port = Number(process.env.PORT || 4177);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`);
  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  const target = path.normalize(path.join(publicDir, cleanPath));
  if (!target.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  const filePath = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, "index.html") : target;
  if (!fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Upload Limit Panic running at http://localhost:${port}/`);
  console.log(`Serving ${path.relative(root, publicDir) || "."}`);
});
