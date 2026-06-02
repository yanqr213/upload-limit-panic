const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const required = [
  "index.html",
  "styles.css",
  "game.js",
  "platform.js",
  "manifest.webmanifest",
  "icon.svg",
];

const failures = [];
for (const file of required) {
  const filePath = path.join(src, file);
  if (!fs.existsSync(filePath)) failures.push(`Missing ${file}`);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size < 100) failures.push(`${file} looks too small`);
}

const html = fs.readFileSync(path.join(src, "index.html"), "utf8");
const css = fs.readFileSync(path.join(src, "styles.css"), "utf8");
const game = fs.readFileSync(path.join(src, "game.js"), "utf8");
const platform = fs.readFileSync(path.join(src, "platform.js"), "utf8");

assert(html.includes("<canvas id=\"gameCanvas\""), "Canvas is missing.");
assert(html.includes("Upload Limit Panic"), "Game name is missing.");
assert(html.includes("rel=\"canonical\""), "Canonical URL is missing.");
assert(html.includes("platform.js") && html.includes("game.js"), "Scripts are not loaded.");
assert(css.includes("@media (max-width: 620px)"), "Mobile layout rules are missing.");
assert(html.includes("id=\"bestValue\"") && game.includes("localStorage") && game.includes("bestKey"), "Best score loop is missing.");
assert(game.includes("requestAd(\"rewarded\""), "Rewarded ad hook is missing.");
assert(game.includes("run_start") && game.includes("run_end"), "Local event hooks are missing.");
assert(platform.includes("CrazyGames") && platform.includes("onUnavailable"), "Platform adapter is incomplete.");
assert(!html.includes("click ads") && !game.includes("click ads"), "Unsafe ad-click copy found.");

if (failures.length) {
  console.error("Verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const report = {
  generatedAt: new Date().toISOString(),
  status: "passed",
  files: required,
  checks: [
    "static HTML5 build",
    "canvas game surface",
    "mobile layout",
    "platform ad adapter",
    "local event tracking",
    "no ad-click inducement copy",
  ],
};
fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(path.join(root, "reports", "verification.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log("Upload Limit Panic verification passed.");

function assert(condition, message) {
  if (!condition) failures.push(message);
}
