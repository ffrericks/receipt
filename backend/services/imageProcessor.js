const sharp = require('sharp');

async function process(inputPath, mode = 'normal') {
  const outputPath = inputPath.replace(/(\.\w+)$/, '_processed$1');

  let pipeline = sharp(inputPath).rotate();

  if (mode === 'document') {
    // Agressieve verwerking: hoog contrast + binarisatie (puur zwart/wit)
    // Vergelijkbaar met Google Camera documentmodus — betere OCR op thermische bonnen
    pipeline = pipeline
      .grayscale()
      .linear(1.8, -40)   // contrast verhogen
      .threshold(140);     // alles boven 140 = wit, eronder = zwart
  } else {
    // Zachte verwerking: goed voor foto's met schaduwen of kleur
    pipeline = pipeline
      .grayscale()
      .normalise()
      .sharpen();
  }

  await pipeline.toFile(outputPath);
  return outputPath;
}

module.exports = { process };
