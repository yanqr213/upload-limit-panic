const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");
const reports = path.join(root, "reports");
const failures = [];

const html = read(path.join(src, "index.html"));
const platform = read(path.join(src, "platform.js"));
const game = read(path.join(src, "game.js"));
const css = read(path.join(src, "styles.css"));

assert(platform.includes("crazygames-sdk-v3.js"), "CrazyGames SDK v3 dynamic loader is missing.");
assert(platform.includes("yandex.ru/games/sdk/v2"), "Yandex Games SDK dynamic loader is missing.");
assert(platform.includes("gameplayStart") && platform.includes("gameplayStop"), "Gameplay start/stop hooks are missing.");
assert(platform.includes("loadingStop"), "Loading stop hook is missing.");
assert(platform.includes("LoadingAPI") && platform.includes("ready"), "Yandex LoadingAPI ready hook is missing.");
assert(platform.includes("GameplayAPI") && platform.includes("start") && platform.includes("stop"), "Yandex GameplayAPI hooks are missing.");
assert(platform.includes("showRewardedVideo") && platform.includes("showFullscreenAdv"), "Yandex ad adapter hooks are missing.");
assert(platform.includes("adsAllowed") && platform.includes("params.get(\"ads\") === \"1\""), "Ad requests must be explicitly gated.");
assert(!html.includes("watch ads") && !game.includes("watch ads"), "Build should not contain watch-ad copy.");
assert(css.includes(".platform-crazygames .external-tool-link"), "CrazyGames context should hide external tool link.");
assert(css.includes(".platform-yandex .external-tool-link"), "Yandex context should hide external tool link.");
assert(html.includes("Keyboard: 1 compress") && html.toLowerCase().includes("touch"), "Keyboard/touch control copy is incomplete.");
assert(html.includes("./platform.js") && html.includes("./game.js"), "Scripts should use relative paths.");
assert(!html.includes("http://") && !html.includes("https://sdk.crazygames.com"), "Index should not hardcode external SDK script.");

if (fs.existsSync(dist)) {
  const files = listFiles(dist);
  const totalBytes = files.reduce((sum, file) => sum + fs.statSync(path.join(dist, file)).size, 0);
  assert(files.length <= 12, `Dist should stay small for platform review; found ${files.length} files.`);
  assert(totalBytes < 500000, `Dist should stay under 500KB before SDK/platform wrapping; found ${totalBytes} bytes.`);
  assert(files.includes("index.html"), "Dist is missing index.html.");
}

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? "failed" : "passed",
  checks: [
    "CrazyGames SDK v3 dynamic loader",
    "Yandex Games SDK dynamic loader",
    "loading/gameplay lifecycle hooks",
    "Yandex LoadingAPI and GameplayAPI hooks",
    "explicit ad gating",
    "no watch-ad copy in Basic Launch build",
    "external link hidden in platform contexts",
    "relative paths and small package",
  ],
  failures,
};
fs.mkdirSync(reports, { recursive: true });
fs.writeFileSync(path.join(reports, "crazygames-verification.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Upload Limit Panic platform SDK verification passed.");

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function listFiles(dir, prefix = "") {
  const found = [];
  for (const entry of fs.readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(dir, relative));
    else found.push(relative);
  }
  return found;
}
