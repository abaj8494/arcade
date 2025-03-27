const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICONS_DIR = path.join(__dirname, 'public/images');
const OUTPUT_DIR = path.join(__dirname, 'public/images');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get all SVG files
const svgFiles = fs.readdirSync(ICONS_DIR)
  .filter(file => file.endsWith('.svg'));

console.log(`Found ${svgFiles.length} SVG files to convert`);

// Convert each SVG to PNG
async function convertFiles() {
  for (const svgFile of svgFiles) {
    const baseName = path.basename(svgFile, '.svg');
    const svgPath = path.join(ICONS_DIR, svgFile);
    const outputPath = path.join(OUTPUT_DIR, `${baseName}.png`);
    
    console.log(`Converting ${svgFile} to PNG...`);
    
    try {
      // Read SVG file
      const svgBuffer = fs.readFileSync(svgPath);
      
      // Convert to PNG with sharp
      await sharp(svgBuffer)
        .resize(300, 300)
        .png()
        .toFile(outputPath);
        
      console.log(`Successfully converted ${svgFile} to ${baseName}.png`);
    } catch (error) {
      console.error(`Error converting ${svgFile}:`, error);
    }
  }
}

convertFiles().then(() => {
  console.log('All conversions complete!');
}).catch(err => {
  console.error('Error during conversion:', err);
}); 