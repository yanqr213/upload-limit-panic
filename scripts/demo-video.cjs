const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reports = path.join(root, "reports");
const frames = [
  path.join(reports, "mobile-smoke.png"),
  path.join(reports, "desktop-smoke.png"),
];
const output = path.join(reports, "upload-limit-panic-demo.mp4");
const concatFile = path.join(reports, "demo-video-input.txt");

for (const frame of frames) {
  if (!fs.existsSync(frame)) {
    console.error("Run npm run smoke before npm run demo:video.");
    process.exit(1);
  }
}

const concat = [
  `file '${escapeForConcat(frames[0])}'`,
  "duration 4",
  `file '${escapeForConcat(frames[1])}'`,
  "duration 4",
  `file '${escapeForConcat(frames[1])}'`,
].join("\n");
fs.writeFileSync(concatFile, concat);

const result = spawnSync("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  concatFile,
  "-vf",
  "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=F7F3E8,fps=24",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  output,
], { cwd: root, encoding: "utf8" });

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status || 1);
}

const report = {
  generatedAt: new Date().toISOString(),
  sourceScreenshots: frames.map((frame) => path.relative(root, frame)),
  output: path.relative(root, output),
  bytes: fs.statSync(output).size,
  status: "passed",
};
fs.writeFileSync(path.join(reports, "demo-video.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Demo video written to ${path.relative(root, output)}`);

function escapeForConcat(filePath) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}
