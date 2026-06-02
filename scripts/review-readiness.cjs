const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const reportsDir = path.join(root, "reports");

const CONFIGS = {
  "neon-lane-dash": {
    name: "Neon Lane Dash",
    slug: "neon-lane-dash",
    liveUrl: "https://neon-lane-dash.pages.dev/",
    eventKey: "neon-lane-dash-events",
    platformObject: "NeonLanePlatform",
    pausePrefix: "nld",
    primaryControls: ["A/D", "arrow", "touch", "Focus"],
  },
  "upload-limit-panic": {
    name: "Upload Limit Panic",
    slug: "upload-limit-panic",
    liveUrl: "https://upload-limit-panic.pages.dev/",
    eventKey: "upload-limit-panic-events",
    platformObject: "UploadLimitPlatform",
    pausePrefix: "ulp",
    primaryControls: ["1 compress", "2 convert", "3 send", "4 trash", "Touch"],
  },
};

const config = CONFIGS[pkg.name];
if (!config) {
  console.error(`No review-readiness config for package ${pkg.name}`);
  process.exit(1);
}

const src = {
  html: readText("src/index.html"),
  css: readText("src/styles.css"),
  platform: readText("src/platform.js"),
  game: readText("src/game.js"),
  manifest: readText("src/manifest.webmanifest"),
};
const dist = {
  html: readText("dist/index.html"),
  css: readText("dist/styles.css"),
  platform: readText("dist/platform.js"),
  game: readText("dist/game.js"),
};
const reports = {
  smoke: readJson("reports/smoke.json"),
  verification: readJson("reports/verification.json"),
  platform: readJson("reports/crazygames-verification.json"),
  analytics: readJson("reports/analytics-verification.json"),
  assets: readJson("reports/platform-assets-verification.json"),
  package: readJson("reports/package.json"),
  release: readJson("reports/release-assets.json"),
};

const checks = [];

check("live_canonical_url", src.html.includes(`<link rel="canonical" href="${config.liveUrl}">`), `Canonical points to ${config.liveUrl}.`);
check("dist_built", Boolean(dist.html && dist.css && dist.platform && dist.game), "Build output contains index, styles, platform adapter, and game script.");
check("viewport_ready", src.html.includes('name="viewport"') && src.css.includes("@media"), "Mobile viewport and responsive CSS are present.");
check("canvas_game_surface", src.html.includes("<canvas") && src.game.includes("requestAnimationFrame") && src.game.includes("getContext(\"2d\")"), "Canvas game loop is present.");
check("keyboard_and_touch_controls", controlsPresent(), `Control copy covers ${config.primaryControls.join(", ")}.`);
check("modal_start_flow", src.html.includes('role="dialog"') && src.html.includes("modalPrimary") && src.game.includes("reset(false)"), "Start/restart modal is wired.");
check("local_best_score", src.game.includes("localStorage") && src.game.includes("best"), "Local best-score persistence is present.");
check("anonymous_metrics", src.platform.includes("sendBeacon") && src.platform.includes("/api/event") && src.platform.includes(config.eventKey), "Anonymous event telemetry is local-first and API-backed.");
check("no_secret_literals", noSecrets(), "Source does not contain obvious API keys, account tokens, or payment credentials.");
check("no_server_dependency_in_zip", packageHasOnlyStaticFiles(), "Upload package contains only static dist files.");
check("zip_package_small", zipSmallEnough(), "HTML5 ZIP is present and below the review-size budget.");
check("standalone_ads_disabled", standaloneAdsDisabled(), "Standalone build does not show ads; platform ads require SDK readiness and ads=1.");
check("no_ad_inducement_copy", noAdInducement(), "Game copy avoids ad-click or watch-ad inducement.");
check("platform_external_link_hidden", platformExternalLinksHidden(), "External CTA is hidden in embedded platform contexts.");
check("sdk_adapters_present", sdkAdaptersPresent(), "CrazyGames, Yandex, Playgama, GamePix, and GameDistribution adapters are present.");
check("platform_lifecycle_hooks", lifecycleHooksPresent(), "Loading, gameplay start/stop, pause/resume, and ready lifecycle hooks are present.");
check("rewarded_ads_safe", rewardedAdsSafe(), "Rewarded benefits require provider completion callbacks before granting assist rewards.");
check("gamedistribution_game_id_gate", src.platform.includes("gd_game_id") && !src.platform.includes('gameId: "test"'), "GameDistribution requires dashboard gameId or query parameter.");
check("smoke_report_passed", reports.smoke?.status === "passed", "Browser smoke report passed.");
check("screenshots_exist", screenshotsExist(), "Desktop and mobile smoke screenshots exist and are non-empty.");
check("canvas_nonblank_evidence", Number(reports.smoke?.state?.colored || 0) > 100, "Smoke sampled nonblank canvas pixels.");
check("verification_report_passed", reports.verification?.status === "passed", "General verification report passed.");
check("platform_sdk_report_passed", reports.platform?.status === "passed", "Platform SDK verification report passed.");
check("analytics_report_passed", reports.analytics?.status === "passed", "Analytics verification report passed.");
check("asset_report_passed", reports.assets?.status === "passed", "Platform icon, cover, and social assets passed verification.");
check("release_assets_include_zip", releaseIncludes(`${config.slug}-html5.zip`), "GitHub release includes the HTML5 ZIP asset.");
check("release_assets_include_demo", releaseIncludes(`${config.slug}-demo.mp4`), "GitHub release includes the gameplay demo MP4.");

const failed = checks.filter((item) => !item.passed);
const report = {
  generatedAt: new Date().toISOString(),
  game: config.name,
  liveUrl: config.liveUrl,
  status: failed.length ? "failed" : "passed",
  summary: {
    checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
  },
  checks,
  platformFit: [
    "Zero-domain HTML5 package can be submitted to hosted game portals without buying a domain.",
    "Standalone review build keeps ads disabled and uses platform adapters only inside platform contexts.",
    "Rewarded assists are optional and only granted after platform reward completion callbacks.",
    "External links are hidden when embedded by game platforms.",
  ],
  manualGates: [
    "Developer dashboard signup, email verification, CAPTCHA, legal consent, and payout setup still require the account owner.",
    "Platform acceptance, ad eligibility, real plays, and verified revenue are the money gate.",
    "Do not send bank, Alipay, API token, or private credential details by email.",
  ],
  nextSubmissionOrder: ["CrazyGames", "Yandex Games", "Playgama", "GamePix", "GameDistribution"],
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "review-readiness.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "review-readiness.md"), renderMarkdown(report));

if (failed.length) {
  console.error(`${config.name} review readiness failed:`);
  failed.forEach((item) => console.error(`- ${item.id}: ${item.evidence}`));
  process.exit(1);
}

console.log(`${config.name} review readiness passed (${checks.length} checks).`);

function controlsPresent() {
  const source = `${src.html}\n${src.game}`.toLowerCase();
  return config.primaryControls.every((needle) => source.includes(needle.toLowerCase()));
}

function noSecrets() {
  const source = `${src.html}\n${src.css}\n${src.platform}\n${src.game}\n${src.manifest}`;
  const secretPatterns = [
    /ghp_[A-Za-z0-9_]+/,
    /github_pat_[A-Za-z0-9_]+/,
    /cfat_[A-Za-z0-9_-]+/,
    /sk-[A-Za-z0-9]{20,}/,
    /api[_-]?key\s*[:=]/i,
    /bank\s*account/i,
    /alipay/i,
  ];
  return !secretPatterns.some((pattern) => pattern.test(source));
}

function packageHasOnlyStaticFiles() {
  const files = reports.package?.files;
  if (!Array.isArray(files) || !files.length) return false;
  return files.includes("index.html") && files.includes("game.js") && files.includes("platform.js") && files.every((file) => !file.includes("/") && !file.startsWith("functions"));
}

function zipSmallEnough() {
  const zipPath = path.join(root, "reports", `${config.slug}-html5.zip`);
  return fs.existsSync(zipPath) && fs.statSync(zipPath).size > 1000 && fs.statSync(zipPath).size < 750000;
}

function standaloneAdsDisabled() {
  return src.platform.includes("adsAllowed") &&
    src.platform.includes('params.get("ads") === "1"') &&
    src.html.includes("Ads are disabled") &&
    src.game.includes('requestAd("rewarded"') &&
    src.game.includes('requestAd("interstitial"');
}

function noAdInducement() {
  const source = `${src.html}\n${src.game}`.toLowerCase();
  return !["watch ads", "click ads", "click an ad", "ad wall", "view ads to play"].some((needle) => source.includes(needle));
}

function platformExternalLinksHidden() {
  return ["crazygames", "yandex", "playgama", "gamepix", "gamedistribution"].every((platform) =>
    src.css.includes(`.platform-${platform} .external-tool-link`)
  );
}

function sdkAdaptersPresent() {
  return [
    "crazygames-sdk-v3.js",
    "yandex.ru/games/sdk/v2",
    "bridge.playgama.com/v1/stable/playgama-bridge.js",
    "gamepix.blob.core.windows.net/gpxlib/dev/gamepix.js",
    "html5.api.gamedistribution.com/main.min.js",
  ].every((needle) => src.platform.includes(needle));
}

function lifecycleHooksPresent() {
  return src.platform.includes("loadingStop") &&
    src.platform.includes("LoadingAPI") &&
    src.platform.includes("GameplayAPI") &&
    src.platform.includes("game_ready") &&
    src.platform.includes("gameLoading") &&
    src.platform.includes("gameLoaded") &&
    src.platform.includes("SDK_GAME_PAUSE") &&
    src.platform.includes(`${config.pausePrefix}:platform-pause`) &&
    src.game.includes("platform-pause") &&
    src.game.includes("platform-resume");
}

function rewardedAdsSafe() {
  return src.platform.includes("onRewarded") &&
    src.platform.includes("REWARDED_STATE_CHANGED") &&
    src.platform.includes('adState === "rewarded"') &&
    src.platform.includes("SDK_REWARDED_WATCH_COMPLETE") &&
    src.platform.includes("gameDistributionRewardedComplete") &&
    src.game.includes('requestAd("rewarded"');
}

function screenshotsExist() {
  return ["desktop-smoke.png", "mobile-smoke.png"].every((file) => {
    const filePath = path.join(reportsDir, file);
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 1000;
  });
}

function releaseIncludes(name) {
  return Boolean(reports.release?.assets?.some((asset) => asset.name === name && asset.downloadUrl));
}

function check(id, passed, evidence) {
  checks.push({ id, passed: Boolean(passed), evidence });
}

function readText(relativePath) {
  const filePath = path.join(root, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function readJson(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function renderMarkdown(report) {
  return [
    `# ${report.game} Review Readiness`,
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Live URL: ${report.liveUrl}`,
    "",
    "## Summary",
    "",
    `- Checks: ${report.summary.checks}`,
    `- Passed: ${report.summary.passed}`,
    `- Failed: ${report.summary.failed}`,
    "",
    "## Checks",
    "",
    ...report.checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.id}: ${item.evidence}`),
    "",
    "## Platform Fit",
    "",
    ...report.platformFit.map((item) => `- ${item}`),
    "",
    "## Manual Gates",
    "",
    ...report.manualGates.map((item) => `- ${item}`),
    "",
  ].join("\n");
}
