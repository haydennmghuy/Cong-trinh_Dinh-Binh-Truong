import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const baseDir = 'C:/xampp/htdocs/diachido/dinh-binh-truong';
const directories = [
  'images',
  'images/real',
  'images/gallery'
];

async function convertDir(dir) {
  const fullDir = path.join(baseDir, dir);
  if (!fs.existsSync(fullDir)) return 0;
  
  const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'));
  let savedBytes = 0;
  
  for (const file of files) {
    const inputPath = path.join(fullDir, file);
    const outputPath = inputPath.replace(/\.jpe?g$/, '.webp');
    
    const sizeBefore = fs.statSync(inputPath).size;
    console.log(`Converting ${dir}/${file} (${(sizeBefore / 1024).toFixed(1)} KB)...`);
    
    try {
      await sharp(inputPath)
        .webp({ quality: 80 }) // 80 is excellent quality and much smaller
        .toFile(outputPath);
        
      const sizeAfter = fs.statSync(outputPath).size;
      const saved = sizeBefore - sizeAfter;
      savedBytes += saved;
      
      console.log(` -> Saved as ${outputPath.replace(baseDir, '')} (${(sizeAfter / 1024).toFixed(1)} KB) - saved ${(saved / 1024).toFixed(1)} KB (${((saved / sizeBefore) * 100).toFixed(1)}%)`);
      
      // Delete original
      fs.unlinkSync(inputPath);
    } catch (e) {
      console.error(`Error converting ${file}:`, e);
    }
  }
  return savedBytes;
}

async function main() {
  let totalSaved = 0;
  for (const dir of directories) {
    totalSaved += await convertDir(dir);
  }
  console.log(`\nAll done! Total space saved: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
}

main();
