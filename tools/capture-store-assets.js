const puppeteer = require('puppeteer');
const path = require('path');

const outDir = path.resolve(__dirname, '..', 'store-assets');
const base = 'file:///' + path.resolve(__dirname, '..', 'store-assets').replace(/\\/g, '/');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function resizeBuffer(browser, buf, w, h) {
  const pg = await browser.newPage();
  await pg.setViewport({ width: w + 10, height: h + 10 });
  const b64 = buf.toString('base64');
  await pg.setContent(`<html><body style="margin:0;padding:0;background:transparent">
    <canvas id="c" width="${w}" height="${h}" style="display:block"></canvas>
    <script>
      const img = new Image();
      img.onload = () => { document.getElementById('c').getContext('2d').drawImage(img,0,0,${w},${h}); document.title='done'; };
      img.src = 'data:image/png;base64,${b64}';
    </script></body></html>`);
  await pg.waitForFunction(() => document.title === 'done', { timeout: 5000 }).catch(() => {});
  await sleep(200);
  const canvas = await pg.$('#c');
  const result = canvas ? await canvas.screenshot({ type: 'png' }) : buf;
  await pg.close();
  return result;
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new' });

  // ===== 图标 216×216 =====
  const iconPage = await browser.newPage();
  await iconPage.setViewport({ width: 700, height: 800 });
  await iconPage.goto(base + '/icon-512.html', { waitUntil: 'networkidle0' });
  const icons = await iconPage.$$('.icon');
  const iconLabels = ['A', 'B', 'C'];
  const iconNames  = ['阳光小孩', '蓝天书本', '绿芽成长'];

  for (let i = 0; i < icons.length && i < 3; i++) {
    const raw = await icons[i].screenshot({ type: 'png' });
    const resized = await resizeBuffer(browser, raw, 216, 216);
    const outPath = path.join(outDir, `icon-216-${iconLabels[i]}.png`);
    require('fs').writeFileSync(outPath, resized);
    console.log(`✅ icon-216-${iconLabels[i]}.png (${iconNames[i]}) — 216×216`);
  }
  await iconPage.close();

  // ===== 截图 450×800 (9:16) =====
  // 手机屏幕设为 450×800，渲染 screenshots.html 里每个 .phone
  const ssPage = await browser.newPage();
  await ssPage.setViewport({ width: 1400, height: 900 });
  await ssPage.goto(base + '/screenshots.html', { waitUntil: 'networkidle0' });
  const phones = await ssPage.$$('.phone');
  const ssNames = ['screenshot-1-主界面', 'screenshot-2-英语闪卡', 'screenshot-3-古诗背诵'];

  for (let i = 0; i < phones.length && i < 3; i++) {
    const raw = await phones[i].screenshot({ type: 'png' });
    const resized = await resizeBuffer(browser, raw, 450, 800);
    const outPath = path.join(outDir, `${ssNames[i]}-450x800.png`);
    require('fs').writeFileSync(outPath, resized);
    console.log(`✅ ${ssNames[i]}-450x800.png — 450×800`);
  }
  await ssPage.close();

  await browser.close();
  console.log('\n全部完成！文件保存在 store-assets/');
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
