# Generating Icons

Your extension is ready to use! However, you may want to create custom icons.

## Option 1: Use Online Converter (Easiest)
1. Go to https://cloudconvert.com/svg-to-png
2. Upload the file: icons/icon.svg
3. Convert to PNG at these sizes: 16x16, 48x48, 128x128
4. Save them as icon16.png, icon48.png, icon128.png in the icons/ folder

## Option 2: Use ImageMagick (Command Line)
If you have ImageMagick installed:

```bash
convert icons/icon.svg -resize 16x16 icons/icon16.png
convert icons/icon.svg -resize 48x48 icons/icon48.png
convert icons/icon.svg -resize 128x128 icons/icon128.png
```

## Option 3: Use Figma or Design Tool
1. Open icons/icon.svg in Figma, Sketch, or Inkscape
2. Export as PNG at 16x16, 48x48, and 128x128
3. Save in the icons/ folder

## For Development
You can load and test the extension without icons! Chrome will just use a default icon.