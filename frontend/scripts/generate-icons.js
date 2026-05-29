const sharp = require('sharp');
const path = require('path');

const src = path.join(__dirname, '../public/icon.svg');
const dest = (name) => path.join(__dirname, '../public', name);

async function run() {
  await sharp(src).resize(192, 192).png().toFile(dest('icon-192.png'));
  await sharp(src).resize(512, 512).png().toFile(dest('icon-512.png'));
  console.log('✓ icon-192.png en icon-512.png aangemaakt');
}

run().catch(err => { console.error(err); process.exit(1); });
