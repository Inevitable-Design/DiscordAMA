import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface CollageOptions {
  width: number;
  height: number;
  outputPath?: string;
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

async function ensureDirectoryExists(directory: string) {
  if (!fs.existsSync(directory)) {
    await fs.promises.mkdir(directory, { recursive: true });
  }
}

function calculateOptimalGrid(numImages: number, canvasWidth: number, canvasHeight: number) {
  // Target aspect ratio same as canvas
  const targetRatio = canvasWidth / canvasHeight;
  
  // Find factors of numImages
  let factors = [];
  for (let i = 1; i <= Math.sqrt(numImages); i++) {
    if (numImages % i === 0) {
      factors.push(i);
      if (i !== numImages / i) {
        factors.push(numImages / i);
      }
    }
  }
  
  factors.sort((a, b) => a - b);
  
  // If we don't have enough factors, add one more image to get better factors
  if (factors.length <= 2) {
    return calculateOptimalGrid(numImages + 1, canvasWidth, canvasHeight);
  }

  // Find the best combination of rows and cols
  let bestRows = 1;
  let bestCols = numImages;
  let bestRatioDiff = Math.abs((bestCols / bestRows) - targetRatio);

  for (const rows of factors) {
    const cols = numImages / rows;
    const ratioDiff = Math.abs((cols / rows) - targetRatio);
    
    if (ratioDiff < bestRatioDiff) {
      bestRatioDiff = ratioDiff;
      bestRows = rows;
      bestCols = cols;
    }
  }

  return { cols: bestCols, rows: bestRows };
}

async function processImage(buffer: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(buffer)
    .resize(width, height, {
      fit: 'cover',
      position: 'center'
    })
    .toBuffer();
}

export async function createCollage(imageUrls: string[], options: CollageOptions): Promise<Buffer> {
  try {
    const numImages = imageUrls.length;
    
    // Calculate optimal grid
    const { cols, rows } = calculateOptimalGrid(numImages, options.width, options.height);
    const totalCells = cols * rows;

    // If we need additional images to fill the grid, duplicate some existing ones
    let finalImageUrls = [...imageUrls];
    if (totalCells > numImages) {
      const additionalNeeded = totalCells - numImages;
      for (let i = 0; i < additionalNeeded; i++) {
        finalImageUrls.push(imageUrls[i % numImages]); // Cycle through existing images
      }
    }
    
    // Calculate cell dimensions ensuring no rounding issues
    const cellWidth = Math.floor(options.width / cols);
    const cellHeight = Math.floor(options.height / rows);

    // Adjust canvas size to eliminate any partial pixels
    const finalWidth = cellWidth * cols;
    const finalHeight = cellHeight * rows;

    // Download all images first
    const imageBuffers = await Promise.all(finalImageUrls.map(url => downloadImage(url)));

    // Process images to fit cells exactly
    const processedImages = await Promise.all(
      imageBuffers.map(buffer => processImage(buffer, cellWidth, cellHeight))
    );

    // Create composite array for actual images
    const compositeArray = processedImages.map((buffer, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      return {
        input: buffer,
        top: row * cellHeight,
        left: col * cellWidth,
      };
    });

    // Create the collage
    const collage = await sharp({
      create: {
        width: finalWidth,
        height: finalHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
    .composite(compositeArray)
    .png()
    .toBuffer();

    if (options.outputPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputDir = path.resolve(options.outputPath);
      await ensureDirectoryExists(outputDir);
      
      const filePath = path.join(outputDir, `collage-${timestamp}.png`);
      await fs.promises.writeFile(filePath, collage);
      console.log(`Collage saved to: ${filePath}`);
      console.log(`Grid: ${cols}x${rows} for ${numImages} images (${totalCells} cells)`);
      if (totalCells > numImages) {
        console.log(`Note: ${totalCells - numImages} images were duplicated to fill the grid`);
      }
    }

    return collage;
  } catch (error) {
    throw new Error(`Error creating collage: ${error.message}`);
  }
}