const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const reports = path.join(root, "reports");
const output = path.join(reports, "upload-limit-panic-html5.tar.gz");

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("Run npm run build before npm run package.");
  process.exit(1);
}

const files = listFiles(dist).sort();
const archive = buildTar(dist, files);
fs.mkdirSync(reports, { recursive: true });
fs.writeFileSync(output, zlib.gzipSync(archive, { level: 9 }));

const manifest = {
  generatedAt: new Date().toISOString(),
  package: path.relative(root, output),
  bytes: fs.statSync(output).size,
  files: files.map((file) => file.replaceAll("\\", "/")),
  uploadNotes: [
    "For CrazyGames or itch.io HTML5, upload the contents of dist or this archive when tar.gz is accepted.",
    "Standalone build has no forced ad display; rewarded hooks are adapter-only.",
    "Keep screenshots and validation report with the submission.",
  ],
};
fs.writeFileSync(path.join(reports, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Packaged ${files.length} files to ${path.relative(root, output)}`);

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
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    writeOctal(header, checksum, 148, 8);
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
