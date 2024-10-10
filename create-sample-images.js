const fs = require('fs').promises;
const path = require('path');

async function createSampleImages() {
  const imagesDir = path.join(__dirname, 'public', 'images');
  
  // Ensure the images directory exists
  await fs.mkdir(imagesDir, { recursive: true });

  // Create 5 sample image files
  for (let i = 1; i <= 5; i++) {
    const fileName = `sample_image_${i}.jpg`;
    const filePath = path.join(imagesDir, fileName);
    
    // Create an empty file
    await fs.writeFile(filePath, '');
    console.log(`Created: ${fileName}`);
  }

  console.log('Sample images created successfully!');
}

createSampleImages().catch(console.error);