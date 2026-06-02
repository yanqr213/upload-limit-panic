const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reports = path.join(root, "reports");
const copyPath = path.join(reports, "platform-submission-copy.json");
const mdPath = path.join(reports, "platform-submission-copy.md");
const failures = [];

if (!fs.existsSync(copyPath)) failures.push("Missing platform-submission-copy.json");
if (!fs.existsSync(mdPath)) failures.push("Missing platform-submission-copy.md");

let pack = null;
if (!failures.length) {
  pack = JSON.parse(fs.readFileSync(copyPath, "utf8"));
  const md = fs.readFileSync(mdPath, "utf8");
  assert(Array.isArray(pack.platforms) && pack.platforms.length >= 3, "Copy pack should include at least three platform routes.");
  for (const platformName of ["CrazyGames", "Yandex Games", "itch.io"]) {
    assert(pack.platforms.some((item) => item.platform === platformName), `Copy pack missing ${platformName}.`);
    assert(md.includes(`##`) && md.includes(platformName), `Markdown missing ${platformName}.`);
  }
  for (const platform of pack.platforms || []) {
    assert(platform.submissionUrl && platform.submissionUrl.startsWith("https://"), `${platform.platform} missing submission URL.`);
    assert(platform.monetizationExpectation, `${platform.platform} missing monetization expectation.`);
    assert(platform.copyFields && Object.keys(platform.copyFields).length >= 8, `${platform.platform} has too few copy fields.`);
    const text = JSON.stringify(platform.copyFields).toLowerCase();
    assert(!text.includes("click ads"), `${platform.platform} contains ad-click inducement copy.`);
    assert(!text.includes("watch ads"), `${platform.platform} contains watch-ad copy.`);
    assert(!text.includes("guaranteed revenue"), `${platform.platform} contains guaranteed-revenue copy.`);
    const title = platform.copyFields.title || platform.copyFields.projectName || "";
    const short = platform.copyFields.shortDescription || platform.copyFields.shortText || "";
    assert(title.length > 3 && title.length <= 60, `${platform.platform} title length is not platform-safe.`);
    assert(short.length > 20 && short.length <= 180, `${platform.platform} short description length is not platform-safe.`);
  }
  assert(pack.assets?.releasePage?.startsWith("https://github.com/"), "Missing GitHub release page.");
  assert(String(pack.localFiles?.html5Zip || "").endsWith(".zip"), "Local HTML5 ZIP path missing.");
  assert(fs.existsSync(path.join(root, pack.localFiles.html5Zip || "")), "Local HTML5 ZIP does not exist.");
}

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? "failed" : "passed",
  failures,
};
fs.writeFileSync(path.join(reports, "platform-submission-copy-verification.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Platform submission copy verification passed.");

function assert(condition, message) {
  if (!condition) failures.push(message);
}
