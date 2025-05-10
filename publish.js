// publish.js
// Usage: node publish.js
// Copies the project to 'dist' and strips test code from JS files in the copy.
// Use with: git add dist && git commit -m 'Deploy' && git push

const fs = require('fs');
const path = require('path');

const SRC_DIR = process.cwd();
const DIST_DIR = path.join(SRC_DIR, 'dist');
const DEV_SCRIPTS = ['publish.js', 'strip_testing_code.js'];

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      // Skip .git and dist itself
      if (entry.name === '.git' || entry.name === 'dist') continue;
      copyDir(srcPath, destPath);
    } else {
      // Skip dev scripts
      if (DEV_SCRIPTS.includes(entry.name)) continue;
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function stripTestBlocks(filePath) {
  if (!filePath.endsWith('.js')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/\/\/ --- TESTING ONLY[\s\S]*?\/\/ --- END TESTING ONLY ---\n?/g, '');
  fs.writeFileSync(filePath, content, 'utf8');
}

function stripAllJs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      stripAllJs(entryPath);
    } else if (entry.name.endsWith('.js')) {
      stripTestBlocks(entryPath);
    }
  }
}

// Remove old dist if exists
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}

copyDir(SRC_DIR, DIST_DIR);
stripAllJs(DIST_DIR);
console.log(`Project published to ${DIST_DIR} with test code stripped.`); 