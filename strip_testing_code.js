// strip_testing_code.js
// Usage: node strip_testing_code.js game.js

const fs = require('fs');
const path = process.argv[2];

if (!path) {
  console.error('Usage: node strip_testing_code.js <targetfile.js>');
  process.exit(1);
}

const content = fs.readFileSync(path, 'utf8');
const stripped = content.replace(/\/\/ --- TESTING ONLY[\s\S]*?\/\/ --- END TESTING ONLY ---\n?/g, '');
fs.writeFileSync(path, stripped, 'utf8');
console.log(`Stripped test code from ${path}`); 