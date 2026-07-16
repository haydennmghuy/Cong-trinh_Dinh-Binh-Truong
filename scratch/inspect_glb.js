import fs from 'fs';
import path from 'path';

const file = 'C:/xampp/htdocs/diachido/dinh-binh-truong/models/Ban_Than_Nong.glb';
const buffer = fs.readFileSync(file);

// GLB header is 12 bytes: magic (4), version (4), length (4)
const magic = buffer.toString('utf8', 0, 4);
const version = buffer.readUInt32LE(4);
const length = buffer.readUInt32LE(8);

console.log(`GLB Magic: ${magic}, Version: ${version}, Length: ${length}`);

// First chunk starts at byte 12
const chunkLength = buffer.readUInt32LE(12);
const chunkType = buffer.toString('utf8', 16, 20);

console.log(`First Chunk Length: ${chunkLength}, Type: ${chunkType}`);

if (chunkType === 'JSON') {
  const jsonString = buffer.toString('utf8', 20, 20 + chunkLength);
  const json = JSON.parse(jsonString);
  console.log('Nodes in GLTF:');
  console.log(JSON.stringify(json.nodes?.slice(0, 10), null, 2));
  console.log('Meshes in GLTF:');
  console.log(JSON.stringify(json.meshes?.slice(0, 5), null, 2));
  console.log('Accessors in GLTF (first 5):');
  console.log(JSON.stringify(json.accessors?.slice(0, 5), null, 2));
}
