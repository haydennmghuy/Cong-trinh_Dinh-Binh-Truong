import fs from 'fs';
import path from 'path';

const modelsDir = 'C:/xampp/htdocs/diachido/dinh-binh-truong/models';
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb'));

for (const file of files) {
  const filePath = path.join(modelsDir, file);
  const stat = fs.statSync(filePath);
  console.log(`${file}: ${stat.size} bytes`);
}
