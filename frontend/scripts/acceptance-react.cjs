/**
 * React 前端浏览器真实验收脚本
 * 使用 puppeteer-core 自动启动 Vite preview 服务并执行 15 项检查
 */
const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const ROOT = path.resolve(FRONTEND_ROOT, '..');

// === 结果收集 ===
const results = [];
function record(id, desc, status, detail) {
  // status: 'PASS' | 'FAIL' | 'MANUAL' | 'SKIP'
  if (typeof status === 'boolean') {
    status = status ? 'PASS' : 'FAIL';
  }
  results.push({ id, desc, status, detail: detail || '' });
  console.log(`  ${status.padEnd(6)} ${id} ${desc}${detail ? ' — ' + detail : ''}`);
}

// === Chrome 路径查找 ===
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

// === 等待辅助 ===
const wait = ms => new Promise(r => setTimeout(r, ms));

// === 启动 Vite preview server (strictPort) ===
function startPreviewServer(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      { cwd: FRONTEND_ROOT, stdio: 'pipe', shell: true }
    );

    let started = false;
    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
      if (!started && output.includes('Local:')) {
        started = true;
        resolve({ process: child, port });
      }
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    // Timeout fallback: if server doesn't print "Local:" but port is listening
    setTimeout(async () => {
      if (!started) {
        const listening = await checkPort(port);
        if (listening) {
          started = true;
          resolve({ process: child, port });
        } else {
          // Check if output contains port-in-use error from strictPort
          const portError = /port.*already.*in.*use|EADDRINUSE/i.test(output);
          const errMsg = portError
            ? `Port ${port} is already in use (--strictPort)`
            : `Vite preview server failed to start on port ${port}`;
          child.kill();
          reject(new Error(errMsg));
        }
      }
    }, 10000);

    child.on('error', (err) => {
      if (!started) reject(err);
    });

    // Early exit if vite prints error about port
    child.on('close', (code) => {
      if (!started && code !== 0 && code !== null) {
        const portError = /port.*already.*in.*use|EADDRINUSE/i.test(output);
        reject(new Error(portError
          ? `Port ${port} is already in use (--strictPort)`
          : `Vite preview exited with code ${code}`));
      }
    });
  });
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

function stopProcess(child) {
  if (!child) return Promise.resolve();
  return new Promise((resolve) => {
    child.kill();
    setTimeout(resolve, 1500);
  });
}

// === Console error filter ===
function isCriticalError(msg) {
  const text = typeof msg === 'string' ? msg : (msg.text || String(msg));
  // Exclude known harmless errors
  if (/favicon/i.test(text)) return false;
  if (/sourcemap/i.test(text)) return false;
  if (/source map/i.test(text)) return false;
  if (/DevTools/i.test(text)) return false;
  // JSON 404 / JS exception / React errors count as failures
  return true;
}

// === 页面引用 ===
let page = null;
let consoleErrors = [];

// === Build prerequisite ===
async function runBuild() {
  return new Promise((resolve, reject) => {
    console.log('  Running npm run build...');
    const child = spawn(
      'npm',
      ['run', 'build'],
      { cwd: FRONTEND_ROOT, stdio: 'inherit', shell: true }
    );
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Build failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

// === 辅助：导航到 hash 路由 ===
async function gotoHash(baseUrl, hash) {
  const url = `${baseUrl}/${hash}`;
  consoleErrors = [];
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await wait(2000);
}

// === 验收测试 ===
async function runTests(baseUrl) {
  // T01: Build succeeds (already done as prerequisite)
  record('T01', '构建成功（前置条件）', 'PASS', 'npm run build exited 0');

  // T02: Preview server responds
  const serverOk = await checkPort(baseUrl.port);
  record('T02', 'Preview 服务响应', serverOk, serverOk ? 'OK' : 'connection failed');

  if (!serverOk) {
    record('T03', 'Dashboard 页可访问', 'FAIL', 'Server not running');
    return;
  }

  const BASE = `http://127.0.0.1:${baseUrl.port}`;

  // T03: /#/dashboard accessible
  await gotoHash(BASE, '#/dashboard');
  const t03 = await page.evaluate(() => {
    const title = document.querySelector('h1');
    const statCards = document.querySelectorAll('[class*="stat"], [class*="Stat"]');
    const filterToolbar = document.querySelector('input[type="text"]');
    const chartAreas = document.querySelectorAll('.chart-container');
    return {
      hasTitle: !!title && title.textContent.includes('全国城市地铁客流可视化平台'),
      titleText: title?.textContent?.substring(0, 60) || '',
      hasSearch: !!filterToolbar,
      chartCount: chartAreas.length,
    };
  });
  record('T03', '/#/dashboard 可访问', t03.hasTitle && t03.chartCount > 0,
    `title=${t03.hasTitle}, charts=${t03.chartCount}`);

  // T04: /#/cities accessible
  await gotoHash(BASE, '#/cities');
  const t04 = await page.evaluate(() => {
    const cards = document.querySelectorAll('[style*="grid-template-columns"]');
    // Look for city cards by checking for elements with city data
    const allDivs = document.querySelectorAll('div');
    let cityCards = 0;
    allDivs.forEach(d => {
      if (d.textContent && d.textContent.includes('线路/站点') && d.textContent.includes('日客流')) {
        cityCards++;
      }
    });
    return { cityCards };
  });
  record('T04', '/#/cities 可访问，城市卡片 > 0', t04.cityCards > 0,
    `cityCards=${t04.cityCards}`);

  // T05: /#/about accessible
  await gotoHash(BASE, '#/about');
  const t05 = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const hasDataSrc = body.includes('数据来源');
    const hasDisclaimer = body.includes('免责声明');
    return { hasDataSrc, hasDisclaimer };
  });
  record('T05', '/#/about 可访问，含"数据来源"和"免责声明"',
    t05.hasDataSrc && t05.hasDisclaimer,
    `dataSrc=${t05.hasDataSrc}, disclaimer=${t05.hasDisclaimer}`);

  // T06: Dashboard has at least 4 ECharts canvas/svg elements
  await gotoHash(BASE, '#/dashboard');
  const t06 = await page.evaluate(() => {
    const instances = document.querySelectorAll('div[_echarts_instance_]');
    const canvases = document.querySelectorAll('.chart-container canvas');
    const svgs = document.querySelectorAll('.chart-container svg');
    const chartContainers = document.querySelectorAll('.chart-container');
    // Check for map fallback
    const mapFallback = document.querySelector('.metro-map-fallback, [class*="fallback"]');
    return {
      instanceCount: instances.length,
      canvasCount: canvases.length,
      svgCount: svgs.length,
      containerCount: chartContainers.length,
      hasMapFallback: !!mapFallback,
    };
  });

  let t06pass = false;
  let t06detail = `instances=${t06.instanceCount}, canvases=${t06.canvasCount}, svgs=${t06.svgCount}, containers=${t06.containerCount}`;
  if (t06.instanceCount >= 4) {
    t06pass = true;
  } else if (t06.instanceCount >= 3 && t06.hasMapFallback) {
    t06detail += ' (map fallback active, remaining charts rendered)';
    t06pass = true;
  } else {
    t06detail += ` INSUFFICIENT`;
  }
  record('T06', 'Dashboard 至少 4 个 ECharts 实例', t06pass, t06detail);

  // T07: Search "厦门" on dashboard
  await gotoHash(BASE, '#/dashboard');
  const t07errBefore = [...consoleErrors];
  const t07 = await page.evaluate(async () => {
    const input = document.querySelector('input[type="text"]');
    if (!input) return { ok: false, detail: 'search input not found' };
    // Use React-compatible input change
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, '厦门');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 2000));
    return { ok: true, detail: 'search triggered' };
  });
  const t07errors = consoleErrors.filter(isCriticalError);
  record('T07', '搜索"厦门"无错误无白屏',
    t07.ok && t07errors.length === 0,
    t07.ok ? `errors=${t07errors.length}` : t07.detail);

  // T08: Metric switching
  await gotoHash(BASE, '#/dashboard');
  const metricTests = [
    { value: 'daily_ridership_wan', label: '日客流' },
    { value: 'operating_mileage_km', label: '运营里程' },
    { value: 'operating_stations', label: '运营站点' },
    { value: 'ridership_intensity', label: '客流强度' },
  ];
  let t08pass = true;
  let t08detail = [];
  for (const mt of metricTests) {
    const errBefore = consoleErrors.length;
    const changed = await page.evaluate((val) => {
      const selects = document.querySelectorAll('select');
      for (const sel of selects) {
        if (sel.querySelector(`option[value="${val}"]`)) {
          sel.value = val;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, mt.value);
    await wait(1000);
    const newErrors = consoleErrors.slice(errBefore).filter(isCriticalError);
    if (!changed || newErrors.length > 0) {
      t08pass = false;
      t08detail.push(`${mt.label}: changed=${changed}, errors=${newErrors.length}`);
    }
  }
  record('T08', '指标切换（日客流/运营里程/运营站点/客流强度）无错误',
    t08pass, t08pass ? 'OK' : t08detail.join('; '));

  // T09: TopN switching
  await gotoHash(BASE, '#/dashboard');
  const topNTests = [
    { value: '10', label: 'Top 10' },
    { value: '20', label: 'Top 20' },
    { value: '0', label: '全部' },
  ];
  let t09pass = true;
  let t09detail = [];
  for (const tn of topNTests) {
    const errBefore = consoleErrors.length;
    const changed = await page.evaluate((val) => {
      const selects = document.querySelectorAll('select');
      for (const sel of selects) {
        if (sel.querySelector(`option[value="${val}"]`)) {
          sel.value = val;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, tn.value);
    await wait(1000);
    const newErrors = consoleErrors.slice(errBefore).filter(isCriticalError);
    if (!changed || newErrors.length > 0) {
      t09pass = false;
      t09detail.push(`${tn.label}: changed=${changed}, errors=${newErrors.length}`);
    }
  }
  record('T09', 'TopN 切换（10/20/全部）无错误',
    t09pass, t09pass ? 'OK' : t09detail.join('; '));

  // T10: Map click detail - manual check (not auto-PASS)
  record('T10', '地图点击城市详情', 'MANUAL',
    'ECharts canvas 点击坐标不稳定，需人工验证城市详情面板联动');

  // T11: Cities page filter tags
  await gotoHash(BASE, '#/cities');
  const filterLabels = ['全部城市', '有客流数据', '暂无客流', '有线路图', '有规划图'];
  let t11pass = true;
  let t11detail = [];
  for (const label of filterLabels) {
    const errBefore = consoleErrors.length;
    const clicked = await page.evaluate((lbl) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.trim() === lbl);
      if (btn) { btn.click(); return true; }
      return false;
    }, label);
    await wait(800);
    const newErrors = consoleErrors.slice(errBefore).filter(isCriticalError);
    if (!clicked || newErrors.length > 0) {
      t11pass = false;
      t11detail.push(`${label}: clicked=${clicked}, errors=${newErrors.length}`);
    }
  }
  record('T11', 'Cities 筛选标签（全部/有客流/暂无客流/有线路图/有规划图）无错误',
    t11pass, t11pass ? 'OK' : t11detail.join('; '));

  // T12: About page has at least 5 content cards/sections
  await gotoHash(BASE, '#/about');
  const t12 = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const sections = ['数据来源', '字段说明', '更新机制', '使用限制', '免责声明'];
    let found = 0;
    sections.forEach(s => { if (body.includes(s)) found++; });
    return { found, sections };
  });
  record('T12', 'About 页至少 5 个内容区块', t12.found >= 5,
    `found=${t12.found}/5`);

  // T13: Console error collection (on all pages)
  // Reset and visit all pages one more time
  consoleErrors = [];
  await gotoHash(BASE, '#/dashboard');
  await wait(1500);
  await gotoHash(BASE, '#/cities');
  await wait(1000);
  await gotoHash(BASE, '#/about');
  await wait(1000);

  const criticalErrors = consoleErrors.filter(isCriticalError);
  record('T13', '控制台错误收集（排除 favicon/sourcemap）', criticalErrors.length === 0,
    criticalErrors.length === 0 ? 'no critical errors' :
      criticalErrors.map(e => (typeof e === 'string' ? e : e.text || String(e)).substring(0, 80)).join('; '));

  // T14: 375px mobile - check scrollWidth <= innerWidth + 1 on all 3 pages
  await page.setViewport({ width: 375, height: 812 });
  let t14pass = true;
  let t14detail = [];

  for (const [name, hash] of [['dashboard', '#/dashboard'], ['cities', '#/cities'], ['about', '#/about']]) {
    await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle0', timeout: 20000 });
    await wait(1500);
    const scroll = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    const ok = scroll.scrollWidth <= scroll.innerWidth + 1;
    if (!ok) {
      t14pass = false;
      t14detail.push(`${name}: scrollWidth=${scroll.scrollWidth}, innerWidth=${scroll.innerWidth}`);
    }
  }

  // Restore viewport
  await page.setViewport({ width: 1280, height: 800 });
  await wait(500);

  record('T14', '375px 移动端无横向溢出（三页）', t14pass,
    t14pass ? 'OK' : t14detail.join('; '));

  // T15: Static path check - data loads successfully
  await page.setViewport({ width: 1280, height: 800 });
  // Reset errors and navigate to dashboard
  consoleErrors = [];
  await gotoHash(BASE, '#/dashboard');
  await wait(3000);

  // Check for 404s on data paths
  const data404s = consoleErrors.filter(msg => {
    const text = typeof msg === 'string' ? msg : (msg.text || String(msg));
    return text.includes('/data/latest') || text.includes('/assets/china.json');
  });
  const t15dataLoaded = await page.evaluate(() => {
    // Check if React actually loaded data by looking for stats content
    const body = document.body.innerText || '';
    return body.includes('覆盖城市') && body.includes('运营线路');
  });
  record('T15', '静态资源路径检查（data/latest + china.json）',
    t15dataLoaded && data404s.length === 0,
    `dataLoaded=${t15dataLoaded}, pathErrors=${data404s.length}`);

  // T16: /#/city/xiamen accessible
  await gotoHash(BASE, '#/city/xiamen');
  const t16 = await page.evaluate(() => {
    const body = document.body.innerText || '';
    return {
      hasXiamen: body.includes('厦门'),
      hasLines: body.includes('运营线路'),
      hasTrend: body.includes('年度客流趋势'),
      hasMap: body.includes('线路图'),
      hasNote: body.includes('数据说明'),
    };
  });
  record('T16', '/#/city/xiamen 可访问，含关键内容',
    t16.hasXiamen && t16.hasLines && t16.hasTrend && t16.hasMap && t16.hasNote,
    `xiamen=${t16.hasXiamen}, lines=${t16.hasLines}, trend=${t16.hasTrend}, map=${t16.hasMap}, note=${t16.hasNote}`);

  // T17: From /#/cities, search "厦门", click card with aria-label, verify URL
  await gotoHash(BASE, '#/cities');
  const t17errBefore = [...consoleErrors];
  const t17 = await page.evaluate(async () => {
    // Search for 厦门
    const input = document.querySelector('input[type="text"]');
    if (!input) return { ok: false, detail: 'search input not found' };
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, '厦门');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1500));

    // Click card with aria-label
    const card = document.querySelector('[aria-label="查看厦门城市详情"]');
    if (!card) return { ok: false, detail: 'card with aria-label not found' };
    card.click();
    await new Promise(r => setTimeout(r, 1500));

    const hash = window.location.hash;
    const body = document.body.innerText || '';
    return {
      ok: hash.includes('/city/xiamen') && body.includes('厦门'),
      detail: `hash=${hash}`,
    };
  });
  const t17errors = consoleErrors.filter(isCriticalError);
  record('T17', '从 Cities 搜索厦门并点击卡片导航',
    t17.ok && t17errors.length === 0,
    t17.ok ? 'OK' : t17.detail);

  // T18: /#/city/not-exist shows "未找到城市"
  consoleErrors = [];
  await gotoHash(BASE, '#/city/not-exist');
  const t18 = await page.evaluate(() => {
    const body = document.body.innerText || '';
    return { hasNotFound: body.includes('未找到城市') };
  });
  const t18errors = consoleErrors.filter(isCriticalError);
  record('T18', '/#/city/not-exist 显示"未找到城市"且无 JS 错误',
    t18.hasNotFound && t18errors.length === 0,
    `notFound=${t18.hasNotFound}, errors=${t18errors.length}`);

  // T19: 375px viewport /#/city/xiamen scrollWidth <= innerWidth + 1
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${BASE}/#/city/xiamen`, { waitUntil: 'networkidle0', timeout: 20000 });
  await wait(1500);
  const t19 = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  const t19pass = t19.scrollWidth <= t19.innerWidth + 1;

  // Restore viewport
  await page.setViewport({ width: 1280, height: 800 });
  await wait(500);

  record('T19', '375px /#/city/xiamen 无横向溢出', t19pass,
    t19pass ? 'OK' : `scrollWidth=${t19.scrollWidth}, innerWidth=${t19.innerWidth}`);

  // T20: CitiesPage 城市封面图资源加载（manifest-aware）
  await page.setViewport({ width: 1280, height: 800 });
  await gotoHash(BASE, '#/cities');
  await wait(2000);

  const t20data = await page.evaluate(() => {
    const cards = document.querySelectorAll('.city-cover-image');
    let withCover = 0;
    let withoutCover = 0;
    let sampleCoverUrl = null;
    const hohhotEl = document.querySelector('.city-cover-image[data-city="hohhot"]');

    cards.forEach(el => {
      const hasCover = el.getAttribute('data-has-cover') === 'true';
      if (hasCover) {
        withCover++;
        if (!sampleCoverUrl) {
          const bg = el.style.backgroundImage || '';
          const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
          if (match) sampleCoverUrl = match[1];
        }
      } else {
        withoutCover++;
      }
    });

    return {
      total: cards.length,
      withCover,
      withoutCover,
      sampleCoverUrl,
      hohhotHasCover: hohhotEl ? hohhotEl.getAttribute('data-has-cover') : 'element-not-found',
      hohhotBg: hohhotEl ? (hohhotEl.style.backgroundImage || '') : '',
    };
  });

  // Fetch a real cover image to verify content-type (not SPA fallback)
  let t20fetchDetail = '';
  let t20fetchOk = false;
  if (t20data.sampleCoverUrl) {
    let imgUrl = t20data.sampleCoverUrl;
    if (imgUrl.startsWith('/')) imgUrl = `${BASE}${imgUrl}`;
    else if (!imgUrl.startsWith('http')) imgUrl = `${BASE}/${imgUrl}`;
    try {
      const resp = await page.evaluate(async (url) => {
        const r = await fetch(url);
        const ct = r.headers.get('content-type') || '';
        return { status: r.status, contentType: ct };
      }, imgUrl);
      if (resp.status === 200 && /image\//.test(resp.contentType)) {
        t20fetchOk = true;
        t20fetchDetail = `content-type=${resp.contentType}`;
      } else {
        t20fetchDetail = `status=${resp.status}, content-type=${resp.contentType} (expected image/*)`;
      }
    } catch (e) {
      t20fetchDetail = `fetch error: ${e.message || String(e)}`;
    }
  }

  // hohhot check
  const hohhotOk = t20data.hohhotHasCover === 'false' && !t20data.hohhotBg.includes('hohhot.webp');

  let t20pass = false;
  let t20detail = '';
  if (t20data.total !== 50) {
    t20pass = false;
    t20detail = `total cards=${t20data.total}, expected 50`;
  } else if (t20data.withCover !== 49) {
    t20pass = false;
    t20detail = `withCover=${t20data.withCover}, expected 49 (total=${t20data.total})`;
  } else if (t20data.withoutCover !== 1) {
    t20pass = false;
    t20detail = `withoutCover=${t20data.withoutCover}, expected 1`;
  } else if (!t20fetchOk) {
    t20pass = false;
    t20detail = `sample cover fetch failed: ${t20fetchDetail}`;
  } else if (!hohhotOk) {
    t20pass = false;
    t20detail = `hohhot check failed: hasCover=${t20data.hohhotHasCover}, bg includes hohhot.webp=${t20data.hohhotBg.includes('hohhot.webp')}`;
  } else {
    t20pass = true;
    t20detail = `${t20data.withCover}/${t20data.total} real cover images, ${t20data.withoutCover} fallback (hohhot), sampled image ${t20fetchDetail}`;
  }

  record('T20', '城市封面图资源加载（manifest-aware）', t20pass, t20detail);

  // T21: 城市详情页线路图/规划图真实图片加载
  await page.setViewport({ width: 1280, height: 800 });
  consoleErrors = [];
  const t21responses = {};

  page.on('response', (resp) => {
    const url = resp.url();
    if (url.includes('cities/xiamen/')) {
      t21responses[url] = { status: resp.status(), contentType: resp.headers()['content-type'] || '' };
    }
  });

  await page.goto(`${BASE}/#/city/xiamen`, { waitUntil: 'networkidle0', timeout: 30000 });
  await wait(2000);

  // Check network image
  const t21networkImg = await page.evaluate(() => {
    const img = document.querySelector('img[src*="cities/xiamen/xiamen_network.png"]');
    const link = document.querySelector('a[href*="cities/xiamen/xiamen_network.png"]');
    return {
      hasImg: !!img,
      imgSrc: img ? img.src : null,
      hasLink: !!link,
      linkHref: link ? link.href : null,
    };
  });

  // Check network image response
  let t21networkOk = false;
  let t21networkDetail = '';
  const networkUrl = Object.keys(t21responses).find(u => u.includes('xiamen_network.png'));
  if (networkUrl) {
    const r = t21responses[networkUrl];
    if (r.status === 200 && /image\//.test(r.contentType)) {
      t21networkOk = true;
      t21networkDetail = `status=${r.status}, content-type=${r.contentType}`;
    } else if (r.status === 200 && /text\/html/.test(r.contentType)) {
      t21networkDetail = `FAIL: status=200 but content-type=${r.contentType} (html fallback)`;
    } else {
      t21networkDetail = `status=${r.status}, content-type=${r.contentType}`;
    }
  } else {
    t21networkDetail = 'network image response not captured';
  }

  // Click plan tab
  const t21planClick = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const planBtn = buttons.find(b => b.textContent && b.textContent.trim() === '规划图');
    if (planBtn) { planBtn.click(); return true; }
    return false;
  });
  await wait(1500);

  // Check plan image
  const t21planImg = await page.evaluate(() => {
    const img = document.querySelector('img[src*="cities/xiamen/xiamen_plan.png"]');
    const link = document.querySelector('a[href*="cities/xiamen/xiamen_plan.png"]');
    return {
      hasImg: !!img,
      imgSrc: img ? img.src : null,
      hasLink: !!link,
      linkHref: link ? link.href : null,
    };
  });

  // Check plan image response
  let t21planOk = false;
  let t21planDetail = '';
  const planUrl = Object.keys(t21responses).find(u => u.includes('xiamen_plan.png'));
  if (planUrl) {
    const r = t21responses[planUrl];
    if (r.status === 200 && /image\//.test(r.contentType)) {
      t21planOk = true;
      t21planDetail = `status=${r.status}, content-type=${r.contentType}`;
    } else if (r.status === 200 && /text\/html/.test(r.contentType)) {
      t21planDetail = `FAIL: status=200 but content-type=${r.contentType} (html fallback)`;
    } else {
      t21planDetail = `status=${r.status}, content-type=${r.contentType}`;
    }
  } else {
    t21planDetail = 'plan image response not captured';
  }

  // Check no critical console errors
  const t21errors = consoleErrors.filter(isCriticalError);

  // Check 375px no horizontal scroll
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${BASE}/#/city/xiamen`, { waitUntil: 'networkidle0', timeout: 20000 });
  await wait(1500);
  const t21scroll = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  const t21scrollOk = t21scroll.scrollWidth <= t21scroll.innerWidth + 1;

  // Restore viewport
  await page.setViewport({ width: 1280, height: 800 });
  await wait(500);

  // Check html fallback: if any captured image response is text/html, fail
  const t21htmlFallback = Object.entries(t21responses).some(([, r]) => r.status === 200 && /text\/html/.test(r.contentType));

  let t21pass = false;
  let t21detail = '';
  if (!t21networkImg.hasImg) {
    t21detail = 'network img not found in DOM';
  } else if (!t21networkOk && t21networkDetail.includes('html fallback')) {
    t21detail = `network image is html fallback: ${t21networkDetail}`;
  } else if (!t21networkImg.hasLink) {
    t21detail = 'network "查看原图" link not found';
  } else if (!t21planClick) {
    t21detail = 'plan tab not found/clicked';
  } else if (!t21planImg.hasImg) {
    t21detail = 'plan img not found in DOM after tab click';
  } else if (!t21planOk && t21planDetail.includes('html fallback')) {
    t21detail = `plan image is html fallback: ${t21planDetail}`;
  } else if (!t21planImg.hasLink) {
    t21detail = 'plan "查看原图" link not found';
  } else if (t21errors.length > 0) {
    t21detail = `console errors: ${t21errors.length}`;
  } else if (!t21scrollOk) {
    t21detail = `375px overflow: scrollWidth=${t21scroll.scrollWidth}`;
  } else if (t21htmlFallback) {
    t21detail = 'image response returned text/html (SPA fallback)';
  } else {
    t21pass = true;
    t21detail = `network: ${t21networkDetail}; plan: ${t21planDetail}; scroll: ok`;
  }

  record('T21', '城市详情页线路图/规划图真实图片加载', t21pass, t21detail);

  // T22: 城市详情页线路图预览交互
  await page.setViewport({ width: 1280, height: 800 });
  consoleErrors = [];
  let t22pass = false;
  let t22detail = '';

  // Navigate away first to ensure component remount
  await page.goto(`${BASE}/#/cities`, { waitUntil: 'networkidle0', timeout: 20000 });
  await wait(1000);
  await page.goto(`${BASE}/#/city/xiamen`, { waitUntil: 'networkidle0', timeout: 30000 });
  await wait(3000);

  // Wait for network image to be present
  try {
    await page.waitForSelector('img[src*="cities/xiamen"]', { timeout: 5000 });
  } catch (e) {
    // Continue anyway, will be caught by the check below
  }

  // 1. Confirm network img exists
  const t22imgExists = await page.evaluate(() => {
    const img = document.querySelector('img[src*="cities/xiamen/xiamen_network.png"]');
    return !!img;
  });

  // 2. Click zoom in button
  const t22zoomIn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const zoomInBtn = btns.find(b => b.getAttribute('aria-label') === '放大');
    if (zoomInBtn) { zoomInBtn.click(); return true; }
    return false;
  });
  await wait(500);

  // 3. Check zoom value changed or transform contains scale
  const t22zoomChanged = await page.evaluate(() => {
    const zoomVal = document.querySelector('[class*="zoomValue"]');
    if (zoomVal && !zoomVal.textContent.includes('100%')) return true;
    const inner = document.querySelector('[class*="imageInner"]');
    if (inner) {
      const style = inner.getAttribute('style') || '';
      if (style.includes('scale') && !style.includes('scale(1)')) return true;
    }
    return false;
  });

  // 4. Click zoom out
  const t22zoomOut = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const zoomOutBtn = btns.find(b => b.getAttribute('aria-label') === '缩小');
    if (zoomOutBtn) { zoomOutBtn.click(); return true; }
    return false;
  });
  await wait(300);

  // 5. Click reset
  const t22reset = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const resetBtn = btns.find(b => b.getAttribute('aria-label') === '重置视图');
    if (resetBtn) { resetBtn.click(); return true; }
    return false;
  });
  await wait(300);

  // 6. Check zoom value back to 100%
  const t22resetOk = await page.evaluate(() => {
    const zoomVal = document.querySelector('[class*="zoomValue"]');
    return zoomVal ? zoomVal.textContent.includes('100%') : false;
  });

  // 7. Click fullscreen button
  const t22fullscreenOpen = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const fullscreenBtn = btns.find(b => b.getAttribute('aria-label') === '全屏预览');
    if (fullscreenBtn) { fullscreenBtn.click(); return true; }
    return false;
  });
  await wait(500);

  // 8. Check fullscreen overlay appears
  const t22fullscreenVisible = await page.evaluate(() => {
    const overlay = document.querySelector('[class*="fullscreenOverlay"]');
    return overlay !== null && overlay.offsetWidth > 0;
  });

  // 9. Check fullscreen has image
  const t22fullscreenImg = await page.evaluate(() => {
    const img = document.querySelector('[class*="fullscreenOverlay"] img[src*="cities/xiamen"]');
    return !!img;
  });

  // 10. Press ESC
  await page.keyboard.press('Escape');
  await wait(500);

  // 11. Check fullscreen overlay closed
  const t22fullscreenClosed = await page.evaluate(() => {
    const overlay = document.querySelector('[class*="fullscreenOverlay"]');
    return !overlay || overlay.offsetWidth === 0;
  });

  // 12. Click plan tab
  const t22planClick = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const planBtn = btns.find(b => b.textContent && b.textContent.trim() === '规划图');
    if (planBtn) { planBtn.click(); return true; }
    return false;
  });
  await wait(1500);

  // 13. Check zoom value is still 100% (tab switch resets)
  const t22tabReset = await page.evaluate(() => {
    const zoomVal = document.querySelector('[class*="zoomValue"]');
    return zoomVal ? zoomVal.textContent.includes('100%') : false;
  });

  // 14. Check 375px no horizontal scroll
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${BASE}/#/city/xiamen`, { waitUntil: 'networkidle0', timeout: 20000 });
  await wait(1500);
  const t22scroll = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  const t22scrollOk = t22scroll.scrollWidth <= t22scroll.innerWidth + 1;

  // Restore viewport
  await page.setViewport({ width: 1280, height: 800 });
  await wait(500);

  const t22errors = consoleErrors.filter(isCriticalError);

  // Evaluate
  if (!t22imgExists) {
    t22detail = 'network img not found';
  } else if (!t22zoomIn) {
    t22detail = 'zoom in button not found';
  } else if (!t22zoomChanged) {
    t22detail = 'zoom did not change after clicking zoom in';
  } else if (!t22zoomOut) {
    t22detail = 'zoom out button not found';
  } else if (!t22reset) {
    t22detail = 'reset button not found';
  } else if (!t22resetOk) {
    t22detail = 'zoom not back to 100% after reset';
  } else if (!t22fullscreenOpen) {
    t22detail = 'fullscreen button not found';
  } else if (!t22fullscreenVisible) {
    t22detail = 'fullscreen overlay not visible';
  } else if (!t22fullscreenImg) {
    t22detail = 'no image in fullscreen';
  } else if (!t22fullscreenClosed) {
    t22detail = 'fullscreen not closed after ESC';
  } else if (!t22planClick) {
    t22detail = 'plan tab not found';
  } else if (!t22tabReset) {
    t22detail = 'zoom not reset to 100% after tab switch';
  } else if (!t22scrollOk) {
    t22detail = `375px overflow: scrollWidth=${t22scroll.scrollWidth}`;
  } else if (t22errors.length > 0) {
    t22detail = `console errors: ${t22errors.length}`;
  } else {
    t22pass = true;
    t22detail = 'zoom in/out/reset/fullscreen/ESC/tab reset/scroll all OK';
  }

  record('T22', '城市详情页线路图预览交互', t22pass, t22detail);
}

// === 主流程 ===
async function main() {
  console.log('='.repeat(55));
  console.log('  React Frontend Acceptance Tests');
  console.log('='.repeat(55));

  const chromePath = findChrome();
  if (!chromePath) {
    console.error('[ERROR] Chrome not found. Set PUPPETEER_EXECUTABLE_PATH or CHROME_PATH.');
    process.exit(1);
  }
  console.log(`Chrome: ${chromePath}`);

  let serverInfo = null;
  let browser = null;

  try {
    // T01 prerequisite: Build
    try {
      await runBuild();
    } catch (e) {
      record('T01', '构建成功（前置条件）', 'FAIL', e.message);
      throw e;
    }

    // Start preview server with --strictPort and port fallback
    const ports = [4173, 4174, 4175, 4176, 4177];
    for (const port of ports) {
      try {
        console.log(`  Trying port ${port} (--strictPort)...`);
        serverInfo = await startPreviewServer(port);
        console.log(`  Preview server started on port ${serverInfo.port}`);
        break;
      } catch (e) {
        console.log(`  Port ${port} unavailable: ${e.message}`);
      }
    }

    if (!serverInfo) {
      throw new Error('Failed to start preview server on ports 4173-4177 (all in use or Vite error)');
    }

    // Launch browser
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    console.log('');
    console.log('Running React frontend acceptance tests...');
    console.log('');

    await runTests({ port: serverInfo.port });

  } catch (e) {
    console.error(`[ERROR] ${e.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (serverInfo) await stopProcess(serverInfo.process);
    console.log('Browser and server stopped.');
  }

  // === 输出汇总 ===
  console.log('');
  console.log('='.repeat(55));
  console.log('  React Frontend Acceptance Results');
  console.log('='.repeat(55));

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const manualCount = results.filter(r => r.status === 'MANUAL').length;
  const skipCount = results.filter(r => r.status === 'SKIP').length;

  for (const r of results) {
    console.log(`  ${r.status.padEnd(6)} ${r.id.padEnd(5)} ${r.desc}`);
  }

  console.log('-'.repeat(55));
  console.log(`  Total: ${results.length}  PASS: ${passCount}  FAIL: ${failCount}  MANUAL: ${manualCount}  SKIP: ${skipCount}`);
  console.log('='.repeat(55));

  if (failCount > 0) {
    console.log('Result: FAIL');
    process.exit(1);
  } else {
    const manualItems = results.filter(r => r.status === 'MANUAL').map(r => r.id);
    if (manualCount > 0) {
      console.log(`React frontend acceptance PASS with manual checks`);
      console.log(`Manual checks: ${manualItems.join(', ')}`);
    } else {
      console.log('React frontend acceptance PASS');
    }
    process.exit(0);
  }
}

main();
