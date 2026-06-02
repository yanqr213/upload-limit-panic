const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const out = path.join(root, "dist-portal-clean");
const reports = path.join(root, "reports");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const CONFIGS = {
  "neon-lane-dash": {
    title: "Neon Lane Dash",
    slug: "neon-lane-dash",
    platformObject: "NeonLanePlatform",
    eventKey: "neon-lane-dash-events",
    cleanText: "Clean portal review build. No third-party ad code, account system, external link, or server call.",
    rewardRegex: /if \(window\.NeonLanePlatform\.adsAllowed\(\) && state\.score < 180 && state\.sparks > 2\) \{[\s\S]*?\} else \{\s*state\.score = Math\.max\(0, state\.score - 80\);\s*\}/,
    rewardReplacement: "state.score = Math.max(0, state.score - 80);",
  },
  "upload-limit-panic": {
    title: "Upload Limit Panic",
    slug: "upload-limit-panic",
    platformObject: "UploadLimitPlatform",
    eventKey: "upload-limit-panic-events",
    cleanText: "Clean portal review build. No third-party ad code, account system, external link, or server call.",
    rewardRegex: /if \(window\.UploadLimitPlatform\.adsAllowed\(\) && state\.score < 120 && state\.sorted > 2\) \{[\s\S]*?\} else \{\s*state\.score = Math\.max\(0, state\.score - 80\);\s*\}/,
    rewardReplacement: "state.score = Math.max(0, state.score - 80);",
  },
};

const config = CONFIGS[pkg.name];
if (!config) {
  console.error(`No clean portal config for package ${pkg.name}`);
  process.exit(1);
}

copyDir(src, out);
writeCleanIndex();
writeCleanStyles();
writeCleanPlatform();
writeCleanGame();
fs.writeFileSync(path.join(out, "build-info.json"), `${JSON.stringify({
  name: config.title,
  generatedAt: new Date().toISOString(),
  buildType: "clean-portal-review",
  useCase: "HTML5 portals that prohibit third-party advertising code, sponsorship links, account systems, or external dependencies inside the uploaded game.",
  monetization: "Use portal-managed ads or revenue share only after the host accepts the game.",
}, null, 2)}\n`);

const files = listFiles(out).sort();
const zipPath = path.join(reports, `${config.slug}-portal-clean.zip`);
const tarPath = path.join(reports, `${config.slug}-portal-clean.tar.gz`);
fs.mkdirSync(reports, { recursive: true });
fs.writeFileSync(zipPath, buildZip(out, files));
fs.writeFileSync(tarPath, zlib.gzipSync(buildTar(out, files), { level: 9 }));

const verification = verifyCleanFiles(files);
const report = {
  generatedAt: new Date().toISOString(),
  game: config.title,
  status: verification.failures.length ? "failed" : "passed",
  buildDir: path.relative(root, out),
  zipPackage: path.relative(root, zipPath),
  tarGzPackage: path.relative(root, tarPath),
  zipBytes: fs.statSync(zipPath).size,
  tarGzBytes: fs.statSync(tarPath).size,
  files: files.map((file) => file.replaceAll("\\", "/")),
  intendedFor: [
    "Kongregate-style portals that reject third-party advertising inside uploaded games.",
    "Feedback portals where a clean static package is safer than an ad-SDK package.",
    "Manual email submissions that ask for a playable ZIP without monetization SDKs.",
  ],
  checks: verification.checks,
  failures: verification.failures,
  uploadNotes: [
    "Use this clean ZIP when a portal bans third-party ad SDKs, sponsorships, external links, account systems, or remote tracking.",
    "Use the regular platform ZIP only when the portal explicitly asks for its SDK adapter.",
    "This package contains index.html at the archive root and runs without server calls.",
  ],
};
fs.writeFileSync(path.join(reports, "clean-portal-package.json"), `${JSON.stringify(report, null, 2)}\n`);

if (report.failures.length) {
  console.error("Clean portal package failed:");
  report.failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Clean portal package written to ${path.relative(root, zipPath)}`);

function writeCleanIndex() {
  const filePath = path.join(out, "index.html");
  let html = fs.readFileSync(filePath, "utf8");
  html = html.replace(/\s*<link rel="canonical" href="[^"]+">/, "");
  html = html.replace(/<span>Standalone review build\. Ads are disabled; optional SDK hooks are gated until platform approval\.<\/span>/, `<span>${config.cleanText}</span>`);
  html = html.replace(/\s*<a class="external-tool-link"[\s\S]*?<\/a>/, "");
  fs.writeFileSync(filePath, html);
}

function writeCleanStyles() {
  const filePath = path.join(out, "styles.css");
  let css = fs.readFileSync(filePath, "utf8");
  css = css.replace(/\n\.platform-crazygames \.external-tool-link,\n\.platform-yandex \.external-tool-link,\n\.platform-playgama \.external-tool-link,\n\.platform-gamepix \.external-tool-link,\n\.platform-gamedistribution \.external-tool-link \{\n\s*display: none;\n\}/, "");
  fs.writeFileSync(filePath, css);
}

function writeCleanPlatform() {
  const source = `(function () {
  const state = { ready: true, provider: "clean-portal" };

  function init() {
    return Promise.resolve(state);
  }

  function requestAd(kind, callbacks = {}) {
    callbacks.onUnavailable?.({ provider: state.provider, kind });
    return Promise.resolve(false);
  }

  function gameplayStart() {
    return Promise.resolve(false);
  }

  function gameplayStop() {
    return Promise.resolve(false);
  }

  function adsAllowed() {
    return false;
  }

  function track(eventName, payload = {}) {
    const event = { eventName, payload, at: new Date().toISOString(), provider: state.provider };
    try {
      const events = JSON.parse(localStorage.getItem("${config.eventKey}") || "[]");
      events.push(event);
      localStorage.setItem("${config.eventKey}", JSON.stringify(events.slice(-50)));
    } catch {
      // Local-only telemetry is best effort in the clean portal build.
    }
  }

  window.${config.platformObject} = { init, requestAd, gameplayStart, gameplayStop, adsAllowed, track, state };
  setTimeout(() => track("page_view", { target: "game" }), 0);
})();
`;
  fs.writeFileSync(path.join(out, "platform.js"), source);
}

function writeCleanGame() {
  const filePath = path.join(out, "game.js");
  let game = fs.readFileSync(filePath, "utf8");
  game = game.replace(config.rewardRegex, config.rewardReplacement);
  game = game.replace(/async function requestBreakAd\(\) \{[\s\S]*?\n  \}/, "async function requestBreakAd() {\n    return false;\n  }");
  fs.writeFileSync(filePath, game);
}

function verifyCleanFiles(files) {
  const checks = [];
  const failures = [];
  const all = files.map((file) => [file, fs.readFileSync(path.join(out, file), "utf8")]);
  const source = all.map(([, text]) => text).join("\n");
  add("no_external_sdk_urls", !/crazygames|yandex\.ru\/games\/sdk|playgama|gamepix|gamedistribution|gdsdk/i.test(source), "No third-party game/ad provider URL or provider string remains.");
  add("no_remote_tracking", !/sendBeacon|fetch\(|\/api\/event|\/api\/metrics/i.test(source), "No remote metrics or server API calls remain.");
  add("no_external_hrefs", !/href="https?:\/\//i.test(source), "No external hyperlinks remain in the uploaded game package.");
  add("no_ad_runtime_calls", !/requestAd\("rewarded"|requestAd\("interstitial"|showRewarded|showFullscreenAdv|showAd\(/.test(source), "No ad runtime calls remain in clean game logic.");
  add("index_at_root", files.includes("index.html"), "index.html is at the archive root.");
  add("static_small_package", fs.statSync(path.join(reports, `${config.slug}-portal-clean.zip`)).size < 750000, "Clean ZIP is below 750KB.");
  add("clean_build_text", fs.readFileSync(path.join(out, "index.html"), "utf8").includes(config.cleanText), "Clean portal disclosure is visible.");
  add("local_platform_stub", fs.readFileSync(path.join(out, "platform.js"), "utf8").includes('provider: "clean-portal"'), "Platform adapter is a local clean stub.");
  return { checks, failures };

  function add(id, passed, evidence) {
    checks.push({ id, passed: Boolean(passed), evidence });
    if (!passed) failures.push(`${id}: ${evidence}`);
  }
}

function copyDir(from, to) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

function listFiles(dir, prefix = "") {
  const found = [];
  for (const entry of fs.readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(dir, relative));
    else found.push(relative);
  }
  return found;
}

function buildTar(base, files) {
  const chunks = [];
  for (const file of files) {
    const data = fs.readFileSync(path.join(base, file));
    const header = Buffer.alloc(512, 0);
    writeString(header, file.replaceAll("\\", "/"), 0, 100);
    writeOctal(header, 0o644, 100, 8);
    writeOctal(header, 0, 108, 8);
    writeOctal(header, 0, 116, 8);
    writeOctal(header, data.length, 124, 12);
    writeOctal(header, Math.floor(Date.now() / 1000), 136, 12);
    header.fill(" ", 148, 156);
    header[156] = "0".charCodeAt(0);
    writeString(header, "ustar", 257, 6);
    writeString(header, "00", 263, 2);
    writeOctal(header, header.reduce((sum, byte) => sum + byte, 0), 148, 8);
    chunks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512, 0));
  }
  chunks.push(Buffer.alloc(1024, 0));
  return Buffer.concat(chunks);
}

function writeString(buffer, value, offset, length) {
  buffer.write(String(value).slice(0, length), offset, length, "utf8");
}

function writeOctal(buffer, value, offset, length) {
  const text = value.toString(8).padStart(length - 1, "0").slice(0, length - 1);
  buffer.write(`${text}\0`, offset, length, "ascii");
}

function buildZip(base, files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.replaceAll("\\", "/"));
    const data = fs.readFileSync(path.join(base, file));
    const crc = crc32(data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    localParts.push(local, data);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    offset += local.length + data.length;
  }
  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDir, end]);
}

function crc32(buffer) {
  const table = crcTable();
  let crc = 0xffffffff;
  for (const byte of buffer) crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function crcTable() {
  if (crcTable.cache) return crcTable.cache;
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table.push(value >>> 0);
  }
  crcTable.cache = table;
  return table;
}
