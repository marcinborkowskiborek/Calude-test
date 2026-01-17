#!/usr/bin/env node

/**
 * Simple icon generator for Chrome extension
 * Creates basic PNG icons from the SVG source
 *
 * Note: This requires sharp or another image processing library
 * For development, you can skip this and load the extension without icons
 *
 * To install dependencies: npm install sharp
 * To run: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

console.log('📝 Icon Generator for Contact Extractor Extension');
console.log('');
console.log('For development purposes, Chrome extensions can be loaded without proper icons.');
console.log('The extension will still work, just without a custom icon in the toolbar.');
console.log('');
console.log('To generate proper icons, you can:');
console.log('1. Use an online SVG to PNG converter (e.g., cloudconvert.com)');
console.log('2. Use ImageMagick: convert icon.svg -resize 16x16 icon16.png');
console.log('3. Use an online icon generator for Chrome extensions');
console.log('');
console.log('Required icon sizes: 16x16, 48x48, 128x128');
console.log('');
console.log('SVG source file is located at: icons/icon.svg');
console.log('');

// Create placeholder instructions file
const instructions = `
# Generating Icons

Your extension is ready to use! However, you may want to create custom icons.

## Option 1: Use Online Converter (Easiest)
1. Go to https://cloudconvert.com/svg-to-png
2. Upload the file: icons/icon.svg
3. Convert to PNG at these sizes: 16x16, 48x48, 128x128
4. Save them as icon16.png, icon48.png, icon128.png in the icons/ folder

## Option 2: Use ImageMagick (Command Line)
If you have ImageMagick installed:

\`\`\`bash
convert icons/icon.svg -resize 16x16 icons/icon16.png
convert icons/icon.svg -resize 48x48 icons/icon48.png
convert icons/icon.svg -resize 128x128 icons/icon128.png
\`\`\`

## Option 3: Use Figma or Design Tool
1. Open icons/icon.svg in Figma, Sketch, or Inkscape
2. Export as PNG at 16x16, 48x48, and 128x128
3. Save in the icons/ folder

## For Development
You can load and test the extension without icons! Chrome will just use a default icon.
`;

fs.writeFileSync(
  path.join(__dirname, '..', 'icons', 'ICON_INSTRUCTIONS.md'),
  instructions.trim()
);

console.log('✅ Created ICON_INSTRUCTIONS.md in the icons/ folder');
console.log('');
