/* Render existing Bibimer vectors and typography for Google Play. No app/session data. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const {execFileSync} = require('node:child_process');
if (process.platform === 'android') Object.defineProperty(process, 'platform', {value: 'linux'});
const {chromium} = require('../.tools/ui/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'android/app/src/main/assets');
const output = path.join(root, 'release/google-play/graphics');
const font = fs.readFileSync(path.join(assets, 'fonts/SpaceGrotesk-Bold.woff2'));
const brand = fs.readFileSync(path.join(assets, 'brand.svg'), 'utf8');
// Play applies its own icon mask. Preserve the app's paths and use a full square background.
const icon = brand.replaceAll(' rx="26"', '');
const copy = {
  'en-US': ['Your phone.<br>Your agent workspace.', 'A mobile agent development environment.', 'Projects', 'Chat', 'Terminal'],
  'ko-KR': ['내 손안의<br>에이전트 개발 환경', '같은 휴대폰의 Termux에서 개발을 이어가세요.', '프로젝트', '대화', '터미널']
};
const html = locale => {
  const [title, subtitle, project, chat, terminal] = copy[locale];
  return `<!doctype html><html lang="${locale}"><meta charset="utf-8"><style>
  @font-face{font-family:Space;src:url('/font.woff2');font-weight:700}
  *{box-sizing:border-box}body{margin:0;background:#b4e6cd;color:#142b26;font-family:Arial,sans-serif}
  main{width:1024px;height:500px;overflow:hidden;position:relative;padding:66px 58px;background:linear-gradient(110deg,#c7edda,#9fdabf)}
  .logo{font:700 28px Space,sans-serif;letter-spacing:1px;position:relative;z-index:2}
  h1{font-size:${locale === 'ko-KR' ? 40 : 46}px;line-height:1.24;letter-spacing:-1.5px;margin:36px 0 20px;font-weight:700;position:relative;z-index:2}
  p{font-size:${locale === 'ko-KR' ? 17 : 18}px;line-height:1.5;margin:0;position:relative;z-index:2}
  .circle{position:absolute;width:410px;height:410px;right:-60px;top:45px;border:1px solid #77bc9a;border-radius:50%}
  .circle.two{width:290px;height:290px;right:0;top:105px}
  .work{position:absolute;right:58px;top:119px;width:270px;height:230px;transform:rotate(-5deg);border:1px solid #406b5e;background:#193b31;border-radius:20px;padding:25px;color:#e1f4eb;box-shadow:12px 18px 0 #79b697}
  .work b{font-size:19px;display:block;margin-bottom:22px}.line{width:100%;height:8px;background:#426458;border-radius:8px;margin:14px 0}.line.short{width:70%;background:#8bdbbd}
  .tabs{display:flex;gap:10px;margin-top:26px}.tabs span{border:1px solid #688f7f;border-radius:8px;padding:8px 14px;font-size:14px}
  </style><main><div class="logo">BIBIMER</div><h1>${title}</h1><p>${subtitle}</p><div class="circle"></div><div class="circle two"></div><div class="work"><b>${project}</b><div class="line short"></div><div class="line"></div><div class="tabs"><span>${chat}</span><span>${terminal}</span></div></div></main></html>`;
};
(async () => {
  fs.mkdirSync(output, {recursive:true});
  const server = http.createServer((req, res) => {
    if (req.url === '/font.woff2') {res.writeHead(200, {'Content-Type':'font/woff2'});res.end(font);}
    else if (req.url === '/icon') {res.writeHead(200, {'Content-Type':'text/html'});res.end(`<style>body{margin:0}svg{display:block;width:512px;height:512px}</style>${icon}`);}
    else if (copy[req.url.slice(1)]) {res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});res.end(html(req.url.slice(1)));}
    else {res.writeHead(404);res.end();}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.BIBIMER_CHROMIUM || path.join(process.env.PREFIX, 'bin/headless_shell'),args:['--no-sandbox','--disable-dev-shm-usage']});
    const page = await browser.newPage({viewport:{width:1024,height:500},deviceScaleFactor:1});
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base + '/icon');
    await page.locator('svg').screenshot({path:path.join(output, 'icon-512.png'),omitBackground:true});
    const converted = path.join(output, 'icon-512.tmp.png');
    execFileSync('magick', [path.join(output, 'icon-512.png'), 'PNG32:' + converted]);
    fs.renameSync(converted, path.join(output, 'icon-512.png'));
    for (const locale of Object.keys(copy)) {
      await page.goto(base + '/' + locale);
      await page.evaluate(() => document.fonts.ready);
      if (!await page.evaluate(() => document.fonts.check('700 28px Space'))) throw Error('Brand font unavailable');
      await page.screenshot({path:path.join(output, `feature-${locale}.png`)});
    }
    // Check PNG IHDR: Play requires RGB feature graphics and a 32-bit PNG icon.
    for (const file of ['icon-512.png', 'feature-en-US.png', 'feature-ko-KR.png']) {
      const png = fs.readFileSync(path.join(output, file)), isIcon = file.startsWith('icon-');
      if (png.readUInt32BE(16) !== (isIcon ? 512 : 1024) || png.readUInt32BE(20) !== (isIcon ? 512 : 500)
          || png[24] !== 8 || png[25] !== (isIcon ? 6 : 2)) throw Error('Unexpected PNG format: ' + file);
    }
    console.log('Exported icon (512x512 RGBA) and two feature graphics (1024x500 RGB).');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error.message);process.exitCode=1;});
