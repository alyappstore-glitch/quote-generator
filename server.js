const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const app = express();

// Increase payload size limit for large HTML/Images
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

// Helper: Convert file to base64 string
function encodeImage(fileName) {
  try {
    const filePath = path.join(__dirname, fileName);
    if (fs.existsSync(filePath)) {
      const bitmap = fs.readFileSync(filePath);
      const ext = path.extname(filePath).replace('.', '');
      return `data:image/${ext};base64,${bitmap.toString('base64')}`;
    }
    return null;
  } catch (e) {
    console.warn(`Could not load image ${fileName}:`, e.message);
    return null;
  }
}

app.post('/generate-pdf', async (req, res) => {
  try {
    let { html, filename } = req.body;

    // 1. EMBED IMAGES DIRECTLY (Prevents server deadlock)
    // We replace the image tags with the actual image data from the disk
    const headerData = encodeImage('header.png');
    const sideData = encodeImage('side.png');
    const bottomData = encodeImage('bottom.png');
    const bulletData = encodeImage('bulletpoint.png');

    // Regex replacement to handle src="header.png" OR src="http://.../header.png"
    if (headerData) html = html.replace(/src="[^"]*header\.png"/g, `src="${headerData}"`);
    if (sideData) html = html.replace(/src="[^"]*side\.png"/g, `src="${sideData}"`);
    if (bottomData) html = html.replace(/src="[^"]*bottom\.png"/g, `src="${bottomData}"`);
    if (bulletData) html = html.replace(/src="[^"]*bulletpoint\.png"/g, `src="${bulletData}"`);

    // 2. LAUNCH PUPPETEER WITH DOCKER FLAGS
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Vital for Docker memory limits
        '--single-process',         // Helps on low-resource environments
        '--no-zygote'
      ]
    });

    const page = await browser.newPage();

    // 3. SET CONTENT
    // We use 'domcontentloaded' which is faster and safer than 'networkidle0' for offline content
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`
    });
    res.send(pdf);

  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).send("Error generating PDF: " + error.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on port ${PORT}`));
