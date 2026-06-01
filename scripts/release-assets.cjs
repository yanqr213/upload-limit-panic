const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const tag = "platform-submission-v1";
const releaseName = "Upload Limit Panic Platform Submission Pack";
const reportPath = path.join(root, "reports", "release-assets.json");
const assets = [
  { file: "reports/upload-limit-panic-html5.zip", label: "HTML5 ZIP package for itch.io and platform upload" },
  { file: "reports/upload-limit-panic-demo.mp4", label: "8-second vertical gameplay demo MP4" },
  { file: "reports/platform-submission.md", label: "copy-ready platform submission notes" },
  { file: "reports/platform-submission.json", label: "machine-readable platform submission fields" },
  { file: "reports/upload-limit-panic-icon-512.png", label: "512x512 platform icon" },
  { file: "reports/upload-limit-panic-cover-16x9.png", label: "1280x720 platform cover image" },
  { file: "reports/upload-limit-panic-social-card.png", label: "1200x630 social preview card" },
  { file: "reports/platform-assets.json", label: "platform image asset manifest" },
  { file: "reports/crazygames-verification.json", label: "CrazyGames Basic Launch readiness checks" },
  { file: "reports/analytics-verification.json", label: "anonymous gameplay metrics verification" },
  { file: "reports/smoke.json", label: "browser smoke verification" },
];

if (!token) {
  console.error("Set GITHUB_TOKEN or GH_TOKEN before running release:assets.");
  process.exit(1);
}

const repoUrl = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8" }).trim();
const repo = repoUrl.replace(/\.git$/, "").split("github.com/").pop();
if (!repo || repo === repoUrl) {
  console.error(`Cannot detect GitHub repo from origin: ${repoUrl}`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

async function main() {
  for (const asset of assets) {
    const filePath = path.join(root, asset.file);
    if (!fs.existsSync(filePath)) throw new Error(`Missing release asset: ${asset.file}`);
  }

  const release = await upsertRelease();
  const existingAssets = await github(`/repos/${repo}/releases/${release.id}/assets?per_page=100`);
  const uploaded = [];
  for (const asset of assets) {
    const filePath = path.join(root, asset.file);
    const name = path.basename(filePath);
    const existing = existingAssets.find((item) => item.name === name);
    if (existing) await github(`/repos/${repo}/releases/assets/${existing.id}`, { method: "DELETE" });
    const uploadUrl = `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`;
    const payload = await upload(uploadUrl, filePath);
    uploaded.push({
      name,
      label: asset.label,
      size: payload.size || fs.statSync(filePath).size,
      downloadUrl: payload.browser_download_url,
    });
    console.log(`Uploaded ${name}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    releaseUrl: release.html_url,
    tag,
    assets: uploaded,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Release assets report written to ${path.relative(root, reportPath)}`);
}

async function upsertRelease() {
  const existing = await getReleaseByTag(tag);
  const body = releaseBody();
  if (existing) {
    return github(`/repos/${repo}/releases/${existing.id}`, {
      method: "PATCH",
      body: {
        name: releaseName,
        body,
        draft: false,
        prerelease: false,
      },
    });
  }
  return github(`/repos/${repo}/releases`, {
    method: "POST",
    body: {
      tag_name: tag,
      target_commitish: "main",
      name: releaseName,
      body,
      draft: false,
      prerelease: false,
    },
  });
}

function releaseBody() {
  return [
    "Submission-ready package for Upload Limit Panic, a free HTML5 sorting game for zero-domain platform-ad validation.",
    "",
    "Live game: https://upload-limit-panic.pages.dev/",
    "Metrics endpoint: https://upload-limit-panic.pages.dev/api/metrics",
    "",
    "Included assets:",
    ...assets.map((asset) => `- ${path.basename(asset.file)}: ${asset.label}`),
    "",
    "Ad safety:",
    "- Standalone build has ads disabled.",
    "- CrazyGames and Yandex SDK hooks are optional and must only be used after platform approval.",
    "- No ad-click inducement or disguised ad buttons.",
    "",
  ].join("\n");
}

async function getReleaseByTag(releaseTag) {
  const response = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(releaseTag)}`, {
    headers: githubHeaders(),
  });
  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Release lookup failed ${response.status}: ${JSON.stringify(payload).slice(0, 260)}`);
  return payload;
}

async function github(pathName, options = {}) {
  const response = await fetch(`https://api.github.com${pathName}`, {
    method: options.method || "GET",
    headers: { ...githubHeaders(), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) return {};
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`GitHub API ${options.method || "GET"} ${pathName} failed ${response.status}: ${JSON.stringify(payload).slice(0, 260)}`);
  return payload;
}

async function upload(url, filePath) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...githubHeaders(),
      "Content-Type": contentType(filePath),
      "Content-Length": String(fs.statSync(filePath).size),
    },
    body: fs.readFileSync(filePath),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Asset upload failed ${response.status}: ${JSON.stringify(payload).slice(0, 260)}`);
  return payload;
}

function githubHeaders() {
  const authScheme = token.startsWith("ghp_") || token.startsWith("github_pat_") ? "token" : "Bearer";
  return {
    Authorization: `${authScheme} ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "UploadLimitPanic-Release",
  };
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".zip") return "application/zip";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".png") return "image/png";
  if (ext === ".json") return "application/json";
  if (ext === ".md") return "text/markdown; charset=utf-8";
  return "application/octet-stream";
}
