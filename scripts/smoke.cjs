const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "dist");
const reportsDir = path.join(root, "reports");
const port = 4181;

if (!fs.existsSync(path.join(publicDir, "index.html"))) {
  console.error("Run npm run build before npm run smoke.");
  process.exit(1);
}

const server = createServer(publicDir, port);

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}).finally(() => {
  server.close();
});

async function main() {
  await waitForServer(server);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  const events = [];
  page.on("console", (message) => {
    if (message.type() === "error") events.push({ type: "console-error", text: message.text() });
  });
  page.on("pageerror", (error) => events.push({ type: "page-error", text: error.message }));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.click("#modalPrimary");
  await page.keyboard.press("1");
  await page.keyboard.press("2");
  await page.keyboard.press("3");
  await page.keyboard.press("4");
  await page.click("#hintButton");
  await page.waitForTimeout(700);

  const state = await page.evaluate(() => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const sample = ctx.getImageData(40, 40, 40, 40).data;
    let colored = 0;
    for (let index = 0; index < sample.length; index += 4) {
      if (sample[index] !== 0 || sample[index + 1] !== 0 || sample[index + 2] !== 0) colored += 1;
    }
    return {
      score: document.getElementById("scoreValue").textContent,
      currentFile: document.getElementById("currentFileName").textContent,
      modalHidden: document.getElementById("modal").classList.contains("hidden"),
      eventCount: JSON.parse(localStorage.getItem("upload-limit-panic-events") || "[]").length,
      colored,
    };
  });

  fs.mkdirSync(reportsDir, { recursive: true });
  await page.screenshot({ path: path.join(reportsDir, "desktop-smoke.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(reportsDir, "mobile-smoke.png"), fullPage: true });
  await browser.close();

  const failures = [];
  if (!state.modalHidden) failures.push("Start modal did not close.");
  if (!state.currentFile || state.currentFile === "Ready") failures.push("Game did not create a current file.");
  if (state.eventCount < 1) failures.push("Local event tracking did not record run start.");
  if (state.colored < 100) failures.push("Canvas appears blank.");
  if (events.length) failures.push(`Browser errors: ${events.map((event) => event.text).join("; ")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    state,
    browserEvents: events,
    screenshots: ["reports/desktop-smoke.png", "reports/mobile-smoke.png"],
    status: failures.length ? "failed" : "passed",
    failures,
  };
  fs.writeFileSync(path.join(reportsDir, "smoke.json"), `${JSON.stringify(report, null, 2)}\n`);

  if (failures.length) {
    console.error("Smoke failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log("Upload Limit Panic smoke passed.");
}

function createServer(publicDir, port) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
  };
  return http.createServer((request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    const target = path.normalize(path.join(publicDir, cleanPath));
    if (!target.startsWith(publicDir)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    if (!fs.existsSync(target)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream" });
    fs.createReadStream(target).pipe(response);
  }).listen(port);
}

function waitForServer(server) {
  return new Promise((resolve) => {
    if (server.listening) resolve();
    else server.on("listening", resolve);
  });
}
