const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const reports = path.join(root, "reports");
const svgDir = path.join(reports, "platform-svg");

const assets = [
  {
    name: "upload-limit-panic-icon-512.png",
    width: 512,
    height: 512,
    svg: iconSvg,
    label: "512x512 platform icon",
  },
  {
    name: "upload-limit-panic-cover-16x9.png",
    width: 1280,
    height: 720,
    svg: coverSvg,
    label: "1280x720 platform cover",
  },
  {
    name: "upload-limit-panic-social-card.png",
    width: 1200,
    height: 630,
    svg: socialSvg,
    label: "1200x630 social preview card",
  },
];

fs.mkdirSync(reports, { recursive: true });
fs.rmSync(svgDir, { recursive: true, force: true });
fs.mkdirSync(svgDir, { recursive: true });

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const generated = [];
  for (const asset of assets) {
    const svgPath = path.join(svgDir, asset.name.replace(/\.png$/, ".svg"));
    const pngPath = path.join(reports, asset.name);
    const svg = asset.svg(asset.width, asset.height);
    fs.writeFileSync(svgPath, svg, "utf8");
    await page.setViewportSize({ width: asset.width, height: asset.height });
    await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`, { waitUntil: "load" });
    await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: asset.width, height: asset.height } });
    generated.push({
      name: asset.name,
      label: asset.label,
      path: path.relative(root, pngPath),
      width: asset.width,
      height: asset.height,
      bytes: fs.statSync(pngPath).size,
    });
  }
  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    assets: generated,
  };
  fs.writeFileSync(path.join(reports, "platform-assets.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Generated ${generated.length} platform image assets.`);
}

function iconSvg(width, height) {
  return baseSvg(width, height, `
    <rect width="${width}" height="${height}" rx="64" fill="#1c2630"/>
    <rect x="74" y="108" width="364" height="292" rx="28" fill="#fffdf7"/>
    <path d="M338 108v92h92" fill="#f2b84b"/>
    <path d="M338 108v92h92" fill="none" stroke="#1c2630" stroke-width="18" stroke-linejoin="round"/>
    <rect x="126" y="246" width="260" height="44" rx="22" fill="#efe4d0"/>
    <rect x="126" y="246" width="188" height="44" rx="22" fill="#e66a5d"/>
    <text x="256" y="365" text-anchor="middle" font-size="82" font-weight="900" fill="#1c2630">UL</text>
  `);
}

function coverSvg(width, height) {
  return baseSvg(width, height, `
    <rect width="${width}" height="${height}" fill="#f7f3e8"/>
    <rect x="46" y="46" width="${width - 92}" height="${height - 92}" rx="28" fill="#fffdf7" stroke="#d9d0be" stroke-width="3"/>
    <rect x="86" y="88" width="112" height="112" rx="20" fill="#1c2630"/>
    <text x="142" y="158" text-anchor="middle" font-size="38" font-weight="900" fill="#f2b84b">UL</text>
    <text x="230" y="132" font-size="32" font-weight="900" fill="#0a6062">HTML5 ARCADE</text>
    <text x="230" y="190" font-size="76" font-weight="900" fill="#1c2630">Upload Limit Panic</text>
    <text x="230" y="250" font-size="30" font-weight="700" fill="#65727e">Sort files before the upload queue bursts.</text>
    ${fileCard(774, 275, "PDF", "visa_upload.pdf", "34.7 MB", "Compress", "#e66a5d")}
    ${fileCard(520, 402, "PNG", "profile_photo.png", "82 KB", "Send", "#4f9f67")}
    ${lane(124, 504, "Compress", "1", "#e66a5d")}
    ${lane(386, 504, "Convert", "2", "#6f64c8")}
    ${lane(648, 504, "Send", "3", "#4f9f67")}
    ${lane(910, 504, "Trash", "4", "#2f3a45")}
  `);
}

function socialSvg(width, height) {
  return baseSvg(width, height, `
    <rect width="${width}" height="${height}" fill="#1c2630"/>
    <rect x="52" y="52" width="${width - 104}" height="${height - 104}" rx="24" fill="#fffdf7"/>
    <text x="92" y="130" font-size="34" font-weight="900" fill="#0a6062">FREE HTML5 SORTING GAME</text>
    <text x="92" y="220" font-size="82" font-weight="900" fill="#1c2630">Upload Limit Panic</text>
    <text x="92" y="282" font-size="30" font-weight="700" fill="#65727e">Compress, convert, send, or trash before time runs out.</text>
    ${fileCard(720, 292, "DOCX", "tax_receipt.docx", "6.2 MB", "Trash duplicate", "#2f3a45")}
    <rect x="92" y="430" width="224" height="76" rx="14" fill="#e66a5d"/>
    <rect x="338" y="430" width="224" height="76" rx="14" fill="#6f64c8"/>
    <rect x="584" y="430" width="224" height="76" rx="14" fill="#4f9f67"/>
    <rect x="830" y="430" width="224" height="76" rx="14" fill="#2f3a45"/>
    <text x="204" y="480" text-anchor="middle" font-size="28" font-weight="900" fill="#fffdf7">Compress</text>
    <text x="450" y="480" text-anchor="middle" font-size="28" font-weight="900" fill="#fffdf7">Convert</text>
    <text x="696" y="480" text-anchor="middle" font-size="28" font-weight="900" fill="#fffdf7">Send</text>
    <text x="942" y="480" text-anchor="middle" font-size="28" font-weight="900" fill="#fffdf7">Trash</text>
  `);
}

function baseSvg(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:Arial,Helvetica,sans-serif;letter-spacing:0}</style>${body}</svg>`;
}

function fileCard(x, y, ext, name, size, action, color) {
  return `
    <g transform="translate(${x} ${y})">
      <rect width="360" height="150" rx="18" fill="#ffffff" stroke="#1c2630" stroke-width="5"/>
      <rect x="24" y="30" width="78" height="60" rx="10" fill="${color}"/>
      <text x="63" y="69" text-anchor="middle" font-size="22" font-weight="900" fill="#ffffff">${ext}</text>
      <text x="122" y="56" font-size="24" font-weight="900" fill="#1c2630">${name}</text>
      <text x="122" y="92" font-size="22" font-weight="800" fill="#65727e">${size}</text>
      <text x="122" y="124" font-size="20" font-weight="900" fill="${color}">${action}</text>
    </g>
  `;
}

function lane(x, y, label, key, color) {
  return `
    <g transform="translate(${x} ${y})">
      <rect width="220" height="118" rx="16" fill="${color}"/>
      <text x="110" y="55" text-anchor="middle" font-size="30" font-weight="900" fill="#fffdf7">${label}</text>
      <text x="110" y="89" text-anchor="middle" font-size="22" font-weight="900" fill="#fffdf7">${key}</text>
    </g>
  `;
}
