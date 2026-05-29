const Tesseract = require('tesseract.js');

async function extract(imagePath) {
  const { data: { text } } = await Tesseract.recognize(imagePath, 'nld+eng', {
    logger: () => {}
  });
  return text;
}

module.exports = { extract };
