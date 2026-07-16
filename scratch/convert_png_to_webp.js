import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const filesToConvert = [
  'images/real/bia_di_tich_real.png',
  'images/real/bia_tuong_niem_real.png',
  'images/real/ho_chu_tich_hoanh_phi.png',
  'images/real/mieu_ba_ngu_hanh_real.png',
  'images/real/nha_tho_bac_ho_cua_vao.png',
  'images/real/sac_phong_can_canh.png',
  'images/gallery/gallery-8_new.png',
  'images/gallery/hop_thu_lien_lac_1945_1954.png'
];

const baseDir = 'C:/xampp/htdocs/diachido/dinh-binh-truong';

async function convert() {
  let totalSaved = 0;
  for (const file of filesToConvert) {
    const inputPath = path.join(baseDir, file);
    const outputPath = inputPath.replace('.png', '.webp');
    
    if (!fs.existsSync(inputPath)) {
      console.log(`File not found: ${file}`);
      continue;
    }
    
    const sizeBefore = fs.statSync(inputPath).size;
    console.log(`Converting ${file} (${(sizeBefore / 1024).toFixed(1)} KB)...`);
    
    try {
      await sharp(inputPath)
        .webp({ quality: 85 })
        .toFile(outputPath);
        
      const sizeAfter = fs.statSync(outputPath).size;
      const saved = sizeBefore - sizeAfter;
      totalSaved += saved;
      
      console.log(`Saved as ${outputPath.replace(baseDir, '')} (${(sizeAfter / 1024).toFixed(1)} KB) - saved ${(saved / 1024).toFixed(1)} KB (${((saved / sizeBefore) * 100).toFixed(1)}%)`);
      
      // Delete original
      fs.unlinkSync(inputPath);
      console.log(`Deleted original: ${file}`);
    } catch (e) {
      console.error(`Error converting ${file}:`, e);
    }
  }
  console.log(`\nAll done! Total space saved: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
}

convert();
