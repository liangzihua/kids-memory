const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  // 修正路径：store-assets 在项目根目录，不是 tools 下
  const base = 'file:///' + path.resolve(__dirname, '..', 'store-assets').replace(/\\/g, '/');
  const outDir = path.resolve(__dirname, '..', 'store-assets');
  // ===== 图标 512x512 =====
  await page.setViewport({ width: 600, height: 620 });
  await page.goto(base + '/icon-512.html', { waitUntil: 'networkidle0' });

  // 方案A：阳光小孩
  const iconA = await page.$('.s1 .icon, .icon');
  if (iconA) {
    await iconA.screenshot({ path: path.join(outDir, 'icon-512-A.png') });
    console.log('✅ icon-512-A.png 已保存（阳光小孩）');
  }

  const icons = await page.$$('.icon');
  if (icons[1]) {
    await icons[1].screenshot({ path: path.join(outDir, 'icon-512-B.png') });
    console.log('✅ icon-512-B.png 已保存（蓝天书本）');
  }
  if (icons[2]) {
    await icons[2].screenshot({ path: path.join(outDir, 'icon-512-C.png') });
    console.log('✅ icon-512-C.png 已保存（绿芽成长）');
  }

  // ===== 截图 3张手机 =====
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto(base + '/screenshots.html', { waitUntil: 'networkidle0' });

  const phones = await page.$$('.phone');
  const names = ['screenshot-1-主界面.png', 'screenshot-2-英语闪卡.png', 'screenshot-3-古诗背诵.png'];

  for (let i = 0; i < phones.length && i < 3; i++) {
    await phones[i].screenshot({ path: path.join(outDir, names[i]) });
    console.log(`✅ ${names[i]} 已保存`);
  }

  await browser.close();
  console.log('\n全部完成！文件保存在 store-assets/ 目录');
}

capture().catch(e => { console.error('错误:', e.message); process.exit(1); });
