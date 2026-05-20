const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const base = process.env.BASE_URL || 'https://threemoretime.github.io/MAP/';
const BASE = base.endsWith('/') ? base : base + '/';

console.log(`Starting smoke tests against BASE_URL: ${BASE}`);

function findChrome() {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

// 通用的带有重试机制的页面加载辅助函数
async function gotoWithRetry(page, url, options = {}, maxRetries = 3, delay = 4000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Navigating to ${url} (Attempt ${attempt}/${maxRetries})...`);
      const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000, ...options });
      
      // 确认 React 应用已渲染 (包含关键节点 #root)
      if (url.includes('#/')) {
        await page.waitForSelector('#root', { timeout: 4000 });
      }
      return response;
    } catch (err) {
      console.warn(`Attempt ${attempt}/${maxRetries} to navigate to ${url} failed: ${err.message}`);
      if (attempt === maxRetries) {
        throw err;
      }
      console.log(`Waiting ${delay / 1000}s before next attempt due to potential CDN propagation delay...`);
      await wait(delay);
    }
  }
}

async function run() {
  const chromePath = findChrome();
  if (!chromePath) {
    console.error('Error: Google Chrome not found! Please specify PUPPETEER_EXECUTABLE_PATH');
    process.exit(1);
  }

  console.log(`Using Chrome: ${chromePath}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new',
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const criticalErrors = [];

  // 判断是否为关键项目资源
  function isCriticalProjectResource(url) {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url, 'https://dummy.org');
      const pathname = urlObj.pathname;
      // 排除非 Hash 路由本身带来的 404 跳转，它是通过 /404.html 承接并重定向的预期行为
      if (
        pathname === '/MAP/cities' || 
        pathname === '/MAP/cities/' || 
        pathname === '/cities' || 
        pathname === '/cities/'
      ) {
        return false;
      }
    } catch (e) {
      if (
        url.endsWith('/MAP/cities') || 
        url.endsWith('/MAP/cities/') || 
        url.endsWith('/cities') || 
        url.endsWith('/cities/')
      ) {
        return false;
      }
    }

    const criticalPatterns = [
      '/MAP/assets/',
      '/MAP/data/',
      '/MAP/cities/',
      '/assets/',
      '/data/',
      '/cities/'
    ];
    return criticalPatterns.some(pattern => url.includes(pattern));
  }

  // 判断是否是可忽略的控制台错误
  function isIgnorableConsoleError(text) {
    if (!text) return true;

    // 关键项目资源路径的错误绝对不能忽略
    if (isCriticalProjectResource(text)) {
      return false;
    }

    // 忽略 favicon.ico
    if (text.includes('favicon.ico')) return true;
    // 忽略 sourcemap / source map / .js.map
    if (text.includes('sourcemap') || text.includes('source map') || text.includes('.js.map')) return true;
    // 忽略 chrome-extension
    if (text.includes('chrome-extension')) return true;
    // 忽略无具体 URL 的 Failed to load resource + 404
    if (text.includes('Failed to load resource') && text.includes('404') && text.endsWith('()')) return true;

    return false;
  }
  
  // 监听浏览器端报错
  page.on('pageerror', (err) => {
    criticalErrors.push(`Page error: ${err.message}`);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (isIgnorableConsoleError(text)) {
        return;
      }
      criticalErrors.push(`Console error: ${text}`);
    }
  });

  page.on('response', (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 400 && isCriticalProjectResource(url)) {
      criticalErrors.push(`HTTP ${status}: ${url}`);
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    const failure = req.failure();
    const errText = failure ? failure.errorText : 'unknown';
    if (url.includes('favicon.ico') || 
        url.includes('sourcemap') || 
        url.includes('source map') || 
        url.includes('.js.map') || 
        url.includes('chrome-extension')) {
      return;
    }
    criticalErrors.push(`Request failed: ${url} (${errText})`);
  });

  const results = [];
  function record(name, pass, detail = '') {
    results.push({ name, pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'} [${name}] ${detail}`);
  }

  try {
    // 1. 验证常规 Hash 页面可访问性（均带有重试机制）
    const testPages = [
      { name: 'Dashboard', path: '#/dashboard' },
      { name: 'Cities List', path: '#/cities' },
      { name: 'About Page', path: '#/about' },
      { name: 'Foshan Page', path: '#/city/foshan' },
      { name: 'Taiyuan Page', path: '#/city/taiyuan' },
    ];

    for (const p of testPages) {
      const url = `${BASE}${p.path}`;
      try {
        await gotoWithRetry(page, url, {}, 3, 4000);
        await wait(1000);
        record(p.name, true, `Loaded successfully: ${url}`);
      } catch (err) {
        record(p.name, false, `Failed to load ${url} after 3 attempts: ${err.message}`);
      }
    }

    // 2. 验证非 Hash 路径跳转 (/cities -> /#/cities) (支持 3 次重试以容错 CDN 404/跳转路由传播延迟)
    try {
      const nonHashUrl = `${BASE}cities`;
      console.log(`Testing redirect for: ${nonHashUrl}`);
      
      let redirected = false;
      let finalUrl = '';
      const isLocal = BASE.includes('127.0.0.1') || BASE.includes('localhost');
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await page.goto(nonHashUrl, { waitUntil: 'networkidle0', timeout: 20000 });
          await wait(2000);
          finalUrl = page.url();
          redirected = finalUrl.includes('/#/cities');
          if (redirected || isLocal) {
            break;
          }
          console.warn(`Attempt ${attempt}/3: URL did not redirect to /#/cities yet (current: ${finalUrl}). Wait for CDN propagation...`);
          await wait(4000);
        } catch (err) {
          if (attempt === 3) throw err;
          console.warn(`Attempt ${attempt}/3: Error during redirect check: ${err.message}. Retrying in 4s...`);
          await wait(4000);
        }
      }
      
      if (isLocal && !redirected) {
        record('Non-Hash Redirect', true, `SKIPPED (Local dev server does not support 404 redirect, this is expected). URL: ${finalUrl}`);
      } else {
        record('Non-Hash Redirect', redirected, `URL: ${finalUrl} (Expected containing /#/cities)`);
      }
    } catch (err) {
      const isLocal = BASE.includes('127.0.0.1') || BASE.includes('localhost');
      if (isLocal) {
        record('Non-Hash Redirect', true, `SKIPPED (Local dev server error/timeout, this is expected in dev). Error: ${err.message}`);
      } else {
        record('Non-Hash Redirect', false, `Failed: ${err.message}`);
      }
    }

    // 3. 重点验证 /#/city/xiamen 的线路图与规划图加载 (最多重试 3 次，容错图片 CDN 慢同步)
    try {
      const xiamenUrl = `${BASE}#/city/xiamen`;
      console.log(`Testing specialized image loading on Xiamen Page: ${xiamenUrl}`);
      
      let xiamenSuccess = false;
      let xiamenDetail = '';
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await page.goto(xiamenUrl, { waitUntil: 'networkidle0', timeout: 25000 });
          await page.waitForSelector('#root', { timeout: 4000 });
          await wait(2000);

          // 等待线路图加载完成
          let networkComplete = false;
          try {
            await page.waitForFunction(() => {
              const img = document.querySelector('img[src*="cities/xiamen/xiamen_network.png"]');
              return img && img.complete;
            }, { timeout: 10000 });
            networkComplete = true;
          } catch (e) {
            console.log('Timeout waiting for network image to load complete');
          }

          // 检查“图片加载中...”文本是否显示
          const networkLoadingGone = await page.evaluate(() => {
            const loadingDiv = Array.from(document.querySelectorAll('div')).find(el => el.textContent && el.textContent.includes('图片加载中...'));
            return !loadingDiv;
          });

          if (!networkComplete || !networkLoadingGone) {
            throw new Error(`Network map not fully loaded or loading text not gone (complete: ${networkComplete}, loadingTextGone: ${networkLoadingGone})`);
          }

          // 点击规划图 Tab
          const planTabClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const planBtn = buttons.find(b => b.textContent && b.textContent.trim() === '规划图');
            if (planBtn) { planBtn.click(); return true; }
            return false;
          });

          if (!planTabClicked) {
            throw new Error('Could not find or click "规划图" Tab');
          }

          await wait(1500);
          
          // 等待规划图加载完成
          let planComplete = false;
          try {
            await page.waitForFunction(() => {
              const img = document.querySelector('img[src*="cities/xiamen/xiamen_plan.png"]');
              return img && img.complete;
            }, { timeout: 10000 });
            planComplete = true;
          } catch (e) {
            console.log('Timeout waiting for plan image to load complete');
          }

          // 再次检查“图片加载中...”文本是否显示
          const planLoadingGone = await page.evaluate(() => {
            const loadingDiv = Array.from(document.querySelectorAll('div')).find(el => el.textContent && el.textContent.includes('图片加载中...'));
            return !loadingDiv;
          });

          if (!planComplete || !planLoadingGone) {
            throw new Error(`Plan map not fully loaded or loading text not gone (complete: ${planComplete}, loadingTextGone: ${planLoadingGone})`);
          }

          xiamenSuccess = true;
          xiamenDetail = `Network & Plan maps loaded successfully on attempt ${attempt}`;
          break; // 全部成功，跳出重试
        } catch (err) {
          if (attempt === 3) {
            throw err;
          }
          console.warn(`Attempt ${attempt}/3 for Xiamen specialized check failed: ${err.message}. Retrying in 4s...`);
          await wait(4000);
        }
      }

      record('Xiamen Map Load specialized verification', xiamenSuccess, xiamenDetail);
    } catch (err) {
      record('Xiamen Map Load specialized verification', false, `Failed: ${err.message}`);
    }

  } catch (globalErr) {
    console.error(`Global smoke execution error: ${globalErr.message}`);
    criticalErrors.push(globalErr.message);
  } finally {
    await browser.close();
  }

  // 4. 汇总与结论
  console.log('\n=======================================================');
  console.log('  Smoke Test Results Summary');
  console.log('=======================================================');
  
  const hasFailures = results.some(r => !r.pass);
  const hasCriticalErrors = criticalErrors.length > 0;

  if (hasCriticalErrors) {
    console.log('CRITICAL CONSOLE ERRORS DETECTED:');
    criticalErrors.forEach(e => console.log(`  - ${e}`));
  }

  const overallPass = !hasFailures && !hasCriticalErrors;
  
  console.log(`Overall Status: ${overallPass ? 'SUCCESS (PASS)' : 'FAILED (FAIL)'}`);
  
  if (overallPass) {
    console.log('All smoke checks and console health validation passed!');
    process.exit(0);
  } else {
    console.error('Smoke tests failed. Please review errors above.');
    process.exit(1);
  }
}

run();

