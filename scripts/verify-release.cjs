const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "reports", "release-assets.json");
const failures = [];

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

async function main() {
  if (!fs.existsSync(reportPath)) {
    console.error("Missing reports/release-assets.json. Run npm run release:assets first.");
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  if (!report.releaseUrl) failures.push("Release URL missing from report.");
  if (!Array.isArray(report.assets) || report.assets.length < 6) failures.push("Release asset list is incomplete.");

  if (report.releaseUrl) {
    const releaseHtml = await fetchText(report.releaseUrl);
    if (!releaseHtml.includes("Upload Limit Panic Platform Submission Pack")) failures.push("Release page missing title.");
    if (!releaseHtml.includes("upload-limit-panic-html5.zip")) failures.push("Release page missing ZIP asset.");
    if (!releaseHtml.includes("upload-limit-panic-demo.mp4")) failures.push("Release page missing demo MP4 asset.");
    if (!releaseHtml.includes("upload-limit-panic-cover-16x9.png")) failures.push("Release page missing cover image asset.");
    if (!releaseHtml.includes("upload-limit-panic-icon-512.png")) failures.push("Release page missing icon asset.");
  }

  for (const asset of report.assets || []) {
    if (!asset.downloadUrl) {
      failures.push(`Asset ${asset.name || "unknown"} missing download URL.`);
      continue;
    }
    const response = await fetch(asset.downloadUrl, { redirect: "follow" });
    if (!response.ok) failures.push(`Asset download failed ${response.status}: ${asset.downloadUrl}`);
    const length = Number(response.headers.get("content-length")) || 0;
    if (length === 0) failures.push(`Asset download returned empty content-length for ${asset.name}.`);
  }

  const verification = {
    generatedAt: new Date().toISOString(),
    status: failures.length ? "failed" : "passed",
    releaseUrl: report.releaseUrl,
    assetCount: report.assets?.length || 0,
    failures,
  };
  fs.writeFileSync(path.join(root, "reports", "release-verification.json"), `${JSON.stringify(verification, null, 2)}\n`);

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log("Upload Limit Panic release verification passed.");
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    failures.push(`Fetch failed ${response.status}: ${url}`);
    return "";
  }
  return response.text();
}
