const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

app.post('/generate-pdf', async (req, res) => {
  const { html, filename } = req.body;

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

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
});

// Use the environment port OR 3000 if running locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on port ${PORT}`));