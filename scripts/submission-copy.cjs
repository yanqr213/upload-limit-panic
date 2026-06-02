const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reports = path.join(root, "reports");
const submissionPath = path.join(reports, "platform-submission.json");

if (!fs.existsSync(submissionPath)) {
  console.error("Missing reports/platform-submission.json. Run npm run submission first.");
  process.exit(1);
}

const submission = JSON.parse(fs.readFileSync(submissionPath, "utf8"));
const game = submission.game;
const fields = submission.platformFields || {};
const assets = submission.assets || {};
const packages = submission.uploadPackages || {};

const copyPack = {
  generatedAt: new Date().toISOString(),
  goal: "Zero-domain, zero-upfront-cost HTML5 platform submission pack for ad-revenue validation.",
  noDomainDecision: {
    immediate: [
      "Submit to CrazyGames first because it has a self-serve developer portal, platform-hosted distribution, SDK-based ads, and payout setup through Tipalti after revenue eligibility.",
      "Submit to Yandex Games second because it supports platform catalog discovery, SDK-based ad monetization, and publisher-console metrics.",
      "Publish an itch.io mirror only as a free browser-play backup and feedback surface, not as the main advertising route.",
    ],
    parked: [
      "GameDistribution can be evaluated after the first two platforms because it is a revenue-share distributor, but it adds another SDK and lower control over downstream portals.",
      "Douyin and Bilibili mini-game routes are not first because they require extra platform accounts, local mini-game packaging, domestic compliance review, and more account-side setup.",
    ],
  },
  platforms: [
    crazyGamesCopy(),
    yandexGamesCopy(),
    itchCopy(),
  ],
  assets: assetLinks(),
  localFiles: {
    html5Zip: packages.itchIoZip || "",
    distFolder: packages.distFolder || "",
    demoVideo: assets.demoVideo || "",
    icon: assets.platformIcon || "",
    cover: assets.platformCover || "",
    socialCard: assets.socialCard || "",
  },
  validationGate: [
    "Use the HTML5 ZIP with index.html at the archive root.",
    "Keep standalone ads disabled until the platform accepts or requests monetization activation.",
    "Do not use ad-click inducement copy in titles, buttons, screenshots, or descriptions.",
    "Use platform SDK lifecycle hooks for loading and gameplay state.",
    "Hide external links in CrazyGames and Yandex embedded contexts.",
  ],
};

fs.writeFileSync(path.join(reports, "platform-submission-copy.json"), `${JSON.stringify(copyPack, null, 2)}\n`);
fs.writeFileSync(path.join(reports, "platform-submission-copy.md"), renderMarkdown(copyPack));
console.log("Platform submission copy written to reports/platform-submission-copy.json and reports/platform-submission-copy.md");

function crazyGamesCopy() {
  const platform = fields.crazyGames || {};
  return {
    platform: "CrazyGames",
    priority: 1,
    submissionUrl: "https://developer.crazygames.com/",
    monetizationExpectation: "Basic Launch can validate quality first. Ads and revenue share depend on platform selection, ad eligibility, and payment setup.",
    sourceNotes: [
      "CrazyGames documents Basic Launch ads as disabled/no revenue share until later eligibility.",
      "CrazyGames payouts require billing setup and have a minimum payout threshold.",
    ],
    copyFields: {
      title: platform.name || game.title,
      shortDescription: game.shortDescription,
      longDescription: game.longDescription,
      genre: (game.genre || []).join(", "),
      tags: (game.tags || []).join(", "),
      controls: platform.controls || (game.controls || []).join(" "),
      deviceSupport: (game.platforms || []).join(", "),
      language: game.language,
      contentRating: game.contentRating,
      uploadPackage: packages.releaseZip || packages.itchIoZip,
      livePreview: game.liveUrl,
      sdkAndAdsNote: platform.monetizationNote || submission.monetization?.intendedPlatformAds || "",
      complianceNote: (platform.complianceNotes || []).join(" "),
    },
  };
}

function yandexGamesCopy() {
  const platform = fields.yandexGames || {};
  return {
    platform: "Yandex Games",
    priority: 2,
    submissionUrl: "https://yandex.com/dev/games/",
    monetizationExpectation: "Internal monetization can be enabled after publishing and payment details are accepted in the Yandex/YAN partner flow.",
    sourceNotes: [
      "Yandex Games monetization depends on real plays, user retention, ratings, and ad requests through the SDK.",
      "The build includes LoadingAPI.ready, GameplayAPI start/stop, and gated rewarded/fullscreen ad calls.",
    ],
    copyFields: {
      title: platform.name || game.title,
      shortDescription: game.shortDescription,
      longDescription: platform.description || game.longDescription,
      genre: (game.genre || []).join(", "),
      tags: (game.tags || []).join(", "),
      controls: (game.controls || []).join(" "),
      orientation: "Responsive landscape-first layout with desktop keyboard and mobile touch controls.",
      language: game.language,
      ageRating: "Everyone; no violence, gambling, personal data collection, or payments in the standalone build.",
      uploadPackage: packages.releaseZip || packages.itchIoZip,
      livePreview: game.liveUrl,
      sdkAndAdsNote: platform.monetizationNote || submission.monetization?.intendedPlatformAds || "",
      complianceNote: (platform.complianceNotes || []).join(" "),
    },
  };
}

function itchCopy() {
  const platform = fields.itchIo || {};
  return {
    platform: "itch.io",
    priority: 3,
    submissionUrl: "https://itch.io/game/new",
    monetizationExpectation: "Use as a free browser mirror and feedback page. Keep payments disabled during validation.",
    sourceNotes: [
      "The HTML ZIP is packaged with index.html at the root and can run as an embedded browser game.",
      "This is not the primary ad-revenue route.",
    ],
    copyFields: {
      projectName: platform.projectName || game.title,
      classification: platform.classification || "Game",
      kindOfProject: platform.kind || "HTML",
      pricing: platform.price || "No payments",
      embedSetting: platform.embeds || "Run in browser",
      shortText: game.shortDescription,
      description: `${game.longDescription}\n\nControls: ${(game.controls || []).join(" ")}\n\nThis is a free validation build. It has no forced ads, no login, and no in-app purchases.`,
      tags: (game.tags || []).join(", "),
      uploadPackage: packages.itchIoZip,
      coverText: platform.coverText || game.shortDescription,
    },
  };
}

function assetLinks() {
  return {
    icon512: assets.platformIcon,
    releaseIcon512: releaseAssetUrl(assets.platformIcon),
    cover16x9: assets.platformCover,
    releaseCover16x9: releaseAssetUrl(assets.platformCover),
    socialCard: assets.socialCard,
    releaseSocialCard: releaseAssetUrl(assets.socialCard),
    desktopScreenshot: assets.desktopScreenshot,
    mobileScreenshot: assets.mobileScreenshot,
    demoVideo: assets.demoVideo,
    releaseDemoVideo: assets.releaseDemoVideo,
    releasePage: game.releaseUrl,
  };
}

function releaseAssetUrl(localAsset) {
  if (!localAsset || !game.releaseUrl) return "";
  const fileName = path.basename(localAsset);
  return game.releaseUrl.replace("/tag/", "/download/") + `/${fileName}`;
}

function renderMarkdown(pack) {
  const lines = [
    `# ${game.title} Submission Copy Pack`,
    "",
    `Generated: ${pack.generatedAt}`,
    "",
    "## No-domain decision",
    "",
    ...pack.noDomainDecision.immediate.map((item) => `- ${item}`),
    "",
    "## Parked routes",
    "",
    ...pack.noDomainDecision.parked.map((item) => `- ${item}`),
    "",
  ];

  for (const platform of pack.platforms) {
    lines.push(`## ${platform.priority}. ${platform.platform}`, "");
    lines.push(`Submission URL: ${platform.submissionUrl}`, "");
    lines.push(`Monetization expectation: ${platform.monetizationExpectation}`, "");
    lines.push("Source notes:", "");
    lines.push(...platform.sourceNotes.map((item) => `- ${item}`), "");
    lines.push("Copy fields:", "");
    for (const [label, value] of Object.entries(platform.copyFields)) {
      lines.push(`### ${label}`, "", String(value || ""), "");
    }
  }

  lines.push("## Asset links", "");
  for (const [label, value] of Object.entries(pack.assets)) {
    lines.push(`- ${label}: ${value || ""}`);
  }
  lines.push("", "## Validation gate", "");
  lines.push(...pack.validationGate.map((item) => `- ${item}`), "");
  return lines.join("\n");
}
