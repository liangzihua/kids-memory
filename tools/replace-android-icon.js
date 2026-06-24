const puppeteer = require('puppeteer');
const path = require('path');
const fs   = require('fs');

// Android 各 mipmap 目录对应尺寸
const SIZES = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const RES_DIR  = path.resolve(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const ICON_HTML = path.resolve(__dirname, '..', 'store-assets', 'icon-512.html');
const base = 'file:///' + ICON_HTML.replace(/\\/g, '/');

async function resizeTo(browser, srcBuf, size) {
  const pg = await browser.newPage();
  await pg.setViewport({ width: size + 10, height: size + 10 });
  const b64 = srcBuf.toString('base64');
  await pg.setContent(`<html><body style="margin:0;padding:0;background:transparent">
    <canvas id="c" width="${size}" height="${size}" style="display:block"></canvas>
    <script>
      const img = new Image();
      img.onload = () => { document.getElementById('c').getContext('2d').drawImage(img,0,0,${size},${size}); document.title='done'; };
      img.src = 'data:image/png;base64,${b64}';
    </script></body></html>`);
  await pg.waitForFunction(() => document.title === 'done', { timeout: 5000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 150));
  const canvas = await pg.$('#c');
  const buf = canvas ? await canvas.screenshot({ type: 'png' }) : srcBuf;
  await pg.close();
  return buf;
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const iconPage = await browser.newPage();
  await iconPage.setViewport({ width: 600, height: 600 });
  await iconPage.goto(base, { waitUntil: 'networkidle0' });

  // 截取第一个 .icon（方案A 阳光小孩）
  const icons = await iconPage.$$('.icon');
  if (!icons.length) { console.error('未找到 .icon 元素'); await browser.close(); return; }
  const src512 = await icons[0].screenshot({ type: 'png' });
  await iconPage.close();
  console.log('✅ 截取 512px 图标完成');

  for (const { dir, size } of SIZES) {
    const buf = await resizeTo(browser, src512, size);
    const resDir = path.join(RES_DIR, dir);
    // 替换 ic_launcher.png 和 ic_launcher_round.png
    fs.writeFileSync(path.join(resDir, 'ic_launcher.png'), buf);
    fs.writeFileSync(path.join(resDir, 'ic_launcher_round.png'), buf);
    console.log(`✅ ${dir} (${size}x${size})`);
  }

  await browser.close();
  console.log('\n全部完成！图标已替换到 Android 工程。');
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
