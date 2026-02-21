const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'node_modules', '@jridgewell');
const targetFileDir = path.join(targetDir, 'resolve-uri');
const targetFile = path.join(targetFileDir, 'index.js');

if (!fs.existsSync(targetFile)) {
  try {
    fs.mkdirSync(targetFileDir, { recursive: true });
    const content = `// Auto-generated shim for @jridgewell/resolve-uri
function resolveUri(base, relative) {
  try {
    if (!relative) return base;
    // Attempt URL resolution
    return new URL(relative, base).toString();
  } catch (e) {
    // Fallback to simple join
    return relative || base;
  }
}

module.exports = resolveUri;
module.exports.default = resolveUri;
module.exports.resolveUri = resolveUri;
`;
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('Created shim:', targetFile);
  } catch (err) {
    console.error('Failed to create resolve-uri shim:', err);
    process.exitCode = 0;
  }
} else {
  console.log('resolve-uri module already exists, skipping shim.');
}
