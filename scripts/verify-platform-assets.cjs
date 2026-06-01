const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reports = path.join(root, "reports");
const expected = [
  ["upload-limit-panic-icon-512.png", 512, 512],
  ["upload-limit-panic-cover-16x9.png", 1280, 720],
  ["upload-limit-panic-social-card.png", 1200, 630],
];
const failures = [];

for (const [fileName, width, height] of expected) {
  const filePath = path.join(reports, fileName);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing ${fileName}`);
    continue;
  }
  const probe = JSON.parse(execFileSync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "json",
    filePath,
  ], { encoding: "utf8" }));
  const stream = probe.streams?.[0] || {};
  if (stream.width !== width || stream.height !== height) failures.push(`${fileName} is ${stream.width}x${stream.height}, expected ${width}x${height}`);
  if (fs.statSync(filePath).size < 5000) failures.push(`${fileName} looks too small to be a useful platform image.`);
}

const manifestPath = path.join(reports, "platform-assets.json");
if (!fs.existsSync(manifestPath)) failures.push("Missing platform-assets.json");
else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(manifest.assets) || manifest.assets.length < expected.length) failures.push("platform-assets.json missing assets.");
}

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? "failed" : "passed",
  assets: expected.map(([fileName, width, height]) => ({ fileName, width, height })),
  failures,
};
fs.writeFileSync(path.join(reports, "platform-assets-verification.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Platform image asset verification passed.");
