const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");

copyDir(src, dist);
fs.writeFileSync(path.join(dist, "build-info.json"), `${JSON.stringify({
  name: "Upload Limit Panic",
  generatedAt: new Date().toISOString(),
  platformTargets: ["CrazyGames HTML5", "Yandex Games HTML5", "Playgama Bridge", "GamePix HTML5", "GameDistribution HTML5", "itch.io HTML5", "static hosting", "future Douyin mini-game port"],
  ads: "Rewarded and midgame ad hooks are adapter-only; no ads are forced in the standalone build.",
}, null, 2)}\n`);

console.log(`Built static game to ${path.relative(root, dist)}`);

function copyDir(from, to) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(source, target);
    } else {
      fs.copyFileSync(source, target);
    }
  }
}
