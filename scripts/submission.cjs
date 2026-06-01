const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reports = path.join(root, "reports");

const submission = {
  generatedAt: new Date().toISOString(),
  game: {
    title: "Upload Limit Panic",
    shortDescription: "Sort files into Compress, Convert, Send, or Trash before the upload queue bursts.",
    longDescription:
      "Upload Limit Panic is a fast HTML5 sorting game about everyday file-upload problems. Every round throws a new file into the queue: oversized PDFs, wrong-format images, clean files, and duplicates. The player has 60 seconds to sort each file into Compress, Convert, Send, or Trash while the queue pressure rises. It is readable in seconds, works with keyboard or touch controls, and is built as a standalone browser game for zero-domain platform validation.",
    genre: ["Arcade", "Puzzle", "Sorting"],
    tags: ["html5", "arcade", "sorting", "files", "puzzle", "casual", "browser", "no-login"],
    audience: "Casual browser-game players, productivity-tool users, students, and anyone familiar with upload limits.",
    controls: [
      "Keyboard: 1 Compress, 2 Convert, 3 Send, 4 Trash, H Hint.",
      "Mouse or touch: tap the lane buttons or side-panel lane controls.",
    ],
    platforms: ["Desktop browser", "Mobile browser", "Tablet browser"],
    language: "English",
    contentRating: "Everyone / no violence / no gambling / no personal data collection",
    liveUrl: "https://upload-limit-panic.pages.dev/",
    metricsUrl: "https://upload-limit-panic.pages.dev/api/metrics",
    repository: "https://github.com/yanqr213/upload-limit-panic",
    releaseUrl: "https://github.com/yanqr213/upload-limit-panic/releases/tag/platform-submission-v1",
  },
  monetization: {
    currentState: "Standalone build has ads disabled.",
    intendedPlatformAds:
      "Rewarded ads may be used only for optional hints, retry, revive, or bonus time after platform approval. No gameplay button is disguised as an ad, and no user is asked to click ads.",
    adSafety: [
      "No forced ad wall in the standalone build.",
      "No ad-click inducement copy.",
      "No external cash or prize reward for ad viewing.",
      "No false claims about guaranteed upload acceptance or compression results.",
    ],
  },
  uploadPackages: {
    distFolder: "dist/",
    itchIoZip: "reports/upload-limit-panic-html5.zip",
    releaseZip: "https://github.com/yanqr213/upload-limit-panic/releases/download/platform-submission-v1/upload-limit-panic-html5.zip",
    tarGzFallback: "reports/upload-limit-panic-html5.tar.gz",
  },
  assets: {
    desktopScreenshot: "reports/desktop-smoke.png",
    mobileScreenshot: "reports/mobile-smoke.png",
    platformIcon: "reports/upload-limit-panic-icon-512.png",
    platformCover: "reports/upload-limit-panic-cover-16x9.png",
    socialCard: "reports/upload-limit-panic-social-card.png",
    demoVideo: "reports/upload-limit-panic-demo.mp4",
    releaseDemoVideo: "https://github.com/yanqr213/upload-limit-panic/releases/download/platform-submission-v1/upload-limit-panic-demo.mp4",
    icon: "src/icon.svg",
  },
  platformFields: {
    crazyGames: {
      name: "Upload Limit Panic",
      description:
        "A fast file-sorting arcade game. Choose Compress for oversized files, Convert for wrong formats, Send for ready files, and Trash for duplicates before the queue pressure bursts.",
    controls: "1/2/3/4 keys or touch lane buttons; H for hint.",
    monetizationNote:
        "CrazyGames SDK v3 is dynamically loaded only in CrazyGames context. loadingStop, gameplayStart, and gameplayStop hooks are present. Ads are disabled by default for Basic Launch; rewarded placements are gated behind an explicit ads flag and should only be enabled after platform approval.",
      complianceNotes: [
        "Standalone and Basic Launch builds do not request ads.",
        "External tool CTA is hidden in CrazyGames context.",
        "All game files use relative paths and the current package is under 500KB.",
      ],
    },
    itchIo: {
      projectName: "Upload Limit Panic",
      classification: "Game",
      kind: "HTML",
      price: "No payments",
      embeds: "Run in browser",
      upload: "reports/upload-limit-panic-html5.zip",
      coverText: "Sort files before the upload queue bursts.",
    },
  },
  validationGates: [
    "Build, verify, smoke, package, and submission scripts pass locally.",
    "Production Cloudflare Pages URL returns 200.",
    "Production /api/event accepts anonymous aggregate events and /api/metrics returns funnel counts.",
    "ZIP contains index.html at archive root.",
    "Desktop and mobile screenshots are nonblank.",
    "Demo video exists and is under 25 MB.",
  ],
};

fs.mkdirSync(reports, { recursive: true });
fs.writeFileSync(path.join(reports, "platform-submission.json"), `${JSON.stringify(submission, null, 2)}\n`);
fs.writeFileSync(path.join(reports, "platform-submission.md"), renderMarkdown(submission));
console.log("Platform submission pack written to reports/platform-submission.json and reports/platform-submission.md");

function renderMarkdown(data) {
  return [
    "# Upload Limit Panic Platform Submission",
    "",
    `Generated: ${data.generatedAt}`,
    "",
    "## Game",
    "",
    `Title: ${data.game.title}`,
    "",
    data.game.shortDescription,
    "",
    data.game.longDescription,
    "",
    `Live URL: ${data.game.liveUrl}`,
    "",
    `Metrics URL: ${data.game.metricsUrl}`,
    "",
    `Repository: ${data.game.repository}`,
    "",
    `Release pack: ${data.game.releaseUrl}`,
    "",
    "## Controls",
    "",
    ...data.game.controls.map((control) => `- ${control}`),
    "",
    "## Monetization",
    "",
    data.monetization.currentState,
    "",
    data.monetization.intendedPlatformAds,
    "",
    ...data.monetization.adSafety.map((rule) => `- ${rule}`),
    "",
    "## Assets",
    "",
    ...Object.entries(data.assets).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Upload Packages",
    "",
    ...Object.entries(data.uploadPackages).map(([key, value]) => `- ${key}: ${value}`),
    "",
  ].join("\n");
}
