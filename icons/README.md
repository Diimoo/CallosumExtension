# Icons for Callosum Extension

This directory contains the icon assets for the Callosum browser extension.

## File Structure

- `icon.svg` - Source SVG file for the icon
- `16.png` - 16x16 icon (toolbar icon)
- `32.png` - 32x32 icon (toolbar icon for high-DPI displays)
- `48.png` - 48x48 icon (extension management page)
- `96.png` - 96x96 icon (extension installation dialog)
- `128.png` - 128x128 icon (web store)
- `favicon.ico` - Favicon for the options page (copied from 16.png)

## Regenerating Icons

To regenerate the PNG files from the source SVG:

1. Install the required dependencies:
   ```bash
   npm install
   ```

2. Run the icon generation script:
   ```bash
   node generate-icons.js
   ```

### Requirements

For best results, install [Inkscape](https://inkscape.org/) for high-quality SVG to PNG conversion. If Inkscape is not available, the script will fall back to using the `sharp` Node.js module.

## Icon Guidelines

- The icon should be simple, recognizable, and work well at small sizes
- The main color is `#4A6FA5` (a nice blue)
- The icon should be centered in the canvas with appropriate padding
- All icon variants should be visually consistent
