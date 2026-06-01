const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const reports = path.join(root, "reports");
const output = path.join(reports, "upload-limit-panic-html5.tar.gz");
const zipOutput = path.join(reports, "upload-limit-panic-html5.zip");

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("Run npm run build before npm run package.");
  process.exit(1);
}

const files = listFiles(dist).sort();
const archive = buildTar(dist, files);
fs.mkdirSync(reports, { recursive: true });
fs.writeFileSync(output, zlib.gzipSync(archive, { level: 9 }));
fs.writeFileSync(zipOutput, buildZip(dist, files));

const manifest = {
  generatedAt: new Date().toISOString(),
  tarGzPackage: path.relative(root, output),
  zipPackage: path.relative(root, zipOutput),
  tarGzBytes: fs.statSync(output).size,
  zipBytes: fs.statSync(zipOutput).size,
  files: files.map((file) => file.replaceAll("\\", "/")),
  uploadNotes: [
    "For itch.io HTML5, upload the ZIP; it contains index.html at the archive root.",
    "For CrazyGames, upload the dist contents or ZIP according to the developer dashboard prompt.",
    "Standalone build has no forced ad display; rewarded hooks are adapter-only.",
    "Keep screenshots and validation report with the submission.",
  ],
};
fs.writeFileSync(path.join(reports, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Packaged ${files.length} files to ${path.relative(root, output)} and ${path.relative(root, zipOutput)}`);

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
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function crcTable() {
  if (crcTable.cache) return crcTable.cache;
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table.push(value >>> 0);
  }
  crcTable.cache = table;
  return table;
}
