const { chromium } = require('playwright');
const fs = require('fs');
const dir = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const jobs = [['icon', 1024], ['android-icon-foreground', 1024], ['android-icon-monochrome', 1024], ['splash-icon', 512], ['favicon', 96]];
  for (const [name, size] of jobs) {
    await p.setViewportSize({ width: size, height: size });
    const svg = fs.readFileSync(`${dir}/${name}.svg`, 'utf8');
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await p.screenshot({ path: `${dir}/${name}.png`, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  await b.close();
})();
