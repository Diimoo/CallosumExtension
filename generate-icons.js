/**
 * Script to generate icons in different sizes from the source SVG
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Sizes needed for the extension
const SIZES = [16, 32, 48, 96, 128];

// Input and output directories
const ICONS_DIR = path.join(__dirname, 'icons');
const INPUT_SVG = path.join(ICONS_DIR, 'icon.svg');

// Check if Inkscape is installed (for better SVG to PNG conversion)
function isInkscapeInstalled() {
  try {
    execSync('inkscape --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Convert SVG to PNG using Inkscape (preferred)
function convertWithInkscape(inputSvg, outputPng, size) {
  try {
    execSync(`inkscape -w ${size} -h ${size} -o "${outputPng}" "${inputSvg}"`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`Error converting with Inkscape: ${error.message}`);
    return false;
  }
}

// Convert SVG to PNG using a simple fallback (requires 'sharp' package)
function convertWithSharp(inputSvg, outputPng, size) {
  try {
    // Check if sharp is installed
    try {
      require.resolve('sharp');
    } catch (e) {
      console.log('Installing sharp (this may take a minute)...');
      execSync('npm install sharp --no-save', { stdio: 'inherit' });
    }
    
    const sharp = require('sharp');
    
    // Read SVG file
    const svgContent = fs.readFileSync(inputSvg, 'utf8');
    
    // Convert to PNG
    sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(outputPng);
      
    return true;
  } catch (error) {
    console.error(`Error converting with sharp: ${error.message}`);
    return false;
  }
}

// Main function to generate icons
async function generateIcons() {
  console.log('🚀 Generating icons...');
  
  // Check if input SVG exists
  if (!fs.existsSync(INPUT_SVG)) {
    console.error(`Error: Input SVG file not found at ${INPUT_SVG}`);
    process.exit(1);
  }
  
  // Check for conversion methods
  const useInkscape = isInkscapeInstalled();
  
  if (!useInkscape) {
    console.log('ℹ️  Inkscape not found. Using fallback method (requires internet for first run).');
  }
  
  // Create icons directory if it doesn't exist
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }
  
  // Generate each size
  for (const size of SIZES) {
    const outputFile = path.join(ICONS_DIR, `${size}.png`);
    console.log(`Generating ${size}x${size} icon...`);
    
    let success = false;
    
    // Try Inkscape first if available
    if (useInkscape) {
      success = convertWithInkscape(INPUT_SVG, outputFile, size);
    }
    
    // Fallback to sharp if Inkscape fails or isn't available
    if (!success) {
      success = convertWithSharp(INPUT_SVG, outputFile, size);
    }
    
    if (success) {
      console.log(`✓ Created ${outputFile}`);
    } else {
      console.error(`✗ Failed to create ${outputFile}`);
    }
  }
  
  // Copy the 16px icon as favicon.ico
  try {
    const faviconSource = path.join(ICONS_DIR, '16.png');
    const faviconDest = path.join(ICONS_DIR, 'favicon.ico');
    
    if (fs.existsSync(faviconSource)) {
      fs.copyFileSync(faviconSource, faviconDest);
      console.log('✓ Created favicon.ico');
    }
  } catch (error) {
    console.error('Error creating favicon.ico:', error.message);
  }
  
  console.log('\n✨ Icon generation complete!');
}

// Run the script
generateIcons().catch(console.error);
