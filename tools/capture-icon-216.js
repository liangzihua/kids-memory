const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const base = 'file:///' + path.resolve(__dirname, '..', 'store-assets').replace(/\\/g, '/');
  const outDir = path.resolve(__dirname, '..', 'store-assets');

  // 设置 viewport 使图标刚好是 216×216
  // icon 本身是 512px，页面缩放到 216/512 = 0.422
  await page.setViewport({ width: 700, height: 750, deviceScaleFactor: 1 });
  await page.goto(base + '/icon-512.html', { waitUntil: 'networkidle0' });

  // 用 clip 方式精确截 216×216
  // 先找每个 icon 的位置
  const icons = await page.$$('.icon');
  const labels = ['A', 'B', 'C'];
  const names  = ['阳光小孩', '蓝天书本', '绿芽成长'];

  for (let i = 0; i < icons.length && i < 3; i++) {
    const box = await icons[i].boundingBox();
    if (!box) continue;

    // 计算缩放比例：把 512px 的图标截成 216px
    const scale = 216 / box.width;

    // 用 evaluate + canvas 方式缩放
    const outPath = path.join(outDir, `icon-216-${labels[i]}.png`);

    // 先截原始大小
    const tmpBuf = await icons[i].screenshot({ type: 'png' });

    // 用 page.evaluate 生成 216×216 canvas
    await page.setContent(`
      <html><body style="margin:0;padding:0;background:none">
      <canvas id="c" width="216" height="216"></canvas>
      <script>
        const img = new Image();
        img.onload = function() {
          const ctx = document.getElementById('c').getContext('2d');
          ctx.drawImage(img, 0, 0, 216, 216);
        };
        img.src = 'data:image/png;base64,${tmpBuf.toString('base64')}';
      </script>
      </body></html>
    `);
    await page.waitForTimeout(300);
    const canvas = await page.$('#c');
    if (canvas) {
      await canvas.screenshot({ path: outPath });
      console.log(`✅ icon-216-${labels[i]}.png (${names[i]}) 已保存`);
    }

    // 回到图标页继续下一个
    await page.goto(base + '/icon-512.html', { waitUntil: 'networkidle0' });
  }

  await browser.close();
  console.log('\n完成！216×216 图标保存在 store-assets/');
}

capture().catch(e => { console.error('错误:', e.message); process.exit(1); });
