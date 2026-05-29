const sharp = require('sharp');
const path = require('path');

async function process(inputPath) {
  const outputPath = inputPath.replace(/(\.\w+)$/, '_processed$1');
  await sharp(inputPath)
    .rotate()
    .grayscale()
    .normalise()
    .sharpen()
    .toFile(outputPath);
  return outputPath;
}

module.exports = { process };
