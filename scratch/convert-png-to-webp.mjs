import sharp from 'sharp';
import { readFile, unlink, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const files = [
  'images/real/bia_di_tich_real.png',
  'images/real/bia_tuong_niem_real.png',
  'images/real/ho_chu_tich_hoanh_phi.png',
  'images/real/mieu_ba_ngu_hanh_real.png',
  'images/real/nha_tho_bac_ho_cua_vao.png',
  'images/real/sac_phong_can_canh.png',
  'images/gallery/gallery-8_new.png',
  'images/gallery/hop_thu_lien_lac_1945_1954.png',
];

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const inputPath = join(projectRoot, file);
  const outputPath = inputPath.replace(/\.png$/, '.webp');

  try {
    const inputStat = await stat(inputPath);
    const beforeSize = inputStat.size;

    await sharp(inputPath)
      .webp({ quality: 85, alphaQuality: 100 })
      .toFile(outputPath);

    const outputStat = await stat(outputPath);
    const afterSize = outputStat.size;

    totalBefore += beforeSize;
    totalAfter += afterSize;

    const savings = ((1 - afterSize / beforeSize) * 100).toFixed(1);
    console.log(
      `✅ ${file}` +
      `\n   Before: ${(beforeSize / 1024).toFixed(1)} KB → After: ${(afterSize / 1024).toFixed(1)} KB (saved ${savings}%)`
    );

    // Delete original PNG
    await unlink(inputPath);
    console.log(`   🗑️  Deleted original PNG`);
  } catch (err) {
    console.error(`❌ Error processing ${file}: ${err.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Total before: ${(totalBefore / 1024).toFixed(1)} KB`);
console.log(`Total after:  ${(totalAfter / 1024).toFixed(1)} KB`);
console.log(`Total saved:  ${((totalBefore - totalAfter) / 1024).toFixed(1)} KB (${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%)`);
