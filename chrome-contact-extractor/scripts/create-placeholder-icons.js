#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Minimal PNG file (1x1 purple pixel) - Base64 encoded
const purplePNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, '..', 'icons');

console.log('Creating placeholder icon files...');

sizes.forEach(size => {
  const filename = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filename, purplePNG);
  console.log(`✓ Created ${filename}`);
});

console.log('\n✅ Placeholder icons created successfully!');
console.log('Note: These are minimal placeholders. See icons/ICON_INSTRUCTIONS.md for creating proper icons.\n');
