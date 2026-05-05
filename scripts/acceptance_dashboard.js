/**
 * Dashboard 浏览器真实验收脚本
 * 使用 puppeteer-core 自动启动静态服务并执行 16+ 项检查
 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DASHBOARD = path.join(ROOT, 'dashboard.html');
const PORT = 8199;

// === 结果收集 ===
const results = [];
function record(id, desc, pass, detail) {
  results.push({ id, desc, pass, detail: detail || '' });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`  ${mark}  ${id} ${desc}${detail ? ' — ' + detail : ''}`);
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

// === 静态文件服务 ===
function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      let filePath = path.join(ROOT, urlPath === '/' ? 'dashboard.html' : urlPath);
      filePath = path.resolve(filePath);
      if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const ext = path.extname(filePath);
      const mime = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(port, () => resolve(server));
    server.on('error', (e) => reject(e));
  });
}

function stopServer(server) {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
}

// === 等待辅助 ===
const wait = ms => new Promise(r => setTimeout(r, ms));

// === 错误过滤 ===
function isCriticalError(msg) {
  const text = typeof msg === 'string' ? msg : (msg.text || String(msg));
  if (text.includes('favicon')) return false;
  if (text.includes('404')) return false;
  if (text.includes('ERR_CONNECTION_REFUSED')) return false;
  if (text.includes('ERR_ABORTED')) return false;
  if (text.includes('net::')) return false;
  return true;
}

// === 辅助：获取 ECharts 图表数据中的城市名 ===
function getChartCitiesEval(chartId) {
  return page.evaluate((id) => {
    const dom = document.getElementById(id);
    if (!dom) return [];
    const chart = echarts.getInstanceByDom(dom);
    if (!chart) return [];
    const opt = chart.getOption();
    const names = [];
    if (opt.yAxis && opt.yAxis[0] && opt.yAxis[0].data) {
      names.push(...opt.yAxis[0].data);
    }
    return names;
  }, chartId);
}

// === 页面引用（runTests 闭包用） ===
let page = null;
let consoleErrors = [];

// === 验收测试 ===
async function runTests(url) {
  // T01: 页面加载
  let loaded = false;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    loaded = resp.status() === 200;
    record('T01', '页面首次加载', loaded, `status=${loaded ? 200 : 'failed'}`);
  } catch (e) {
    record('T01', '页面首次加载', false, e.message);
    return;
  }

  await wait(3000);

  // T02: 加载阶段控制台无关键错误
  const loadErrors = consoleErrors.filter(isCriticalError);
  record('T02', '控制台无关键报错（加载阶段）', loadErrors.length === 0,
    loadErrors.length === 0 ? '' : loadErrors.map(e => e.substring(0, 80)).join('; '));

  // T03: 地图正常显示
  const mapOk = await page.evaluate(() => {
    const el = document.getElementById('chartMap');
    if (!el) return { ok: false, detail: 'chartMap not found' };
    const canvas = el.querySelector('canvas');
    return { ok: !!canvas, detail: canvas ? 'canvas found' : 'no canvas' };
  });
  record('T03', '地图正常显示', mapOk.ok, mapOk.detail);

  // T04: 搜索"厦门"
  const t04 = await page.evaluate(async () => {
    const input = document.getElementById('citySearch');
    input.value = '厦门';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1500));
    const el = document.getElementById('chartRank');
    const chart = echarts.getInstanceByDom(el);
    if (!chart) return { cities: [], ok: false };
    const opt = chart.getOption();
    const cities = opt.yAxis && opt.yAxis[0] ? opt.yAxis[0].data : [];
    return { cities, ok: cities.length === 1 && cities[0] === '厦门' };
  });
  record('T04', '搜索"厦门"仅显示厦门', t04.ok, `cities: [${t04.cities.join(', ')}]`);

  // T05: 搜索"广"
  const t05 = await page.evaluate(async () => {
    const input = document.getElementById('citySearch');
    input.value = '广';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1500));
    const el = document.getElementById('chartRank');
    const chart = echarts.getInstanceByDom(el);
    if (!chart) return { cities: [], ok: false };
    const opt = chart.getOption();
    const cities = opt.yAxis && opt.yAxis[0] ? opt.yAxis[0].data : [];
    const hasGZ = cities.some(c => c.includes('广'));
    const hasBJ = cities.includes('北京');
    return { cities, ok: hasGZ && !hasBJ };
  });
  record('T05', '搜索"广"匹配广州', t05.ok, `cities: [${t05.cities.join(', ')}]`);

  // 清空搜索
  await page.evaluate(() => {
    const input = document.getElementById('citySearch');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(1000);

  // T06a: 切换日客流指标
  const t06a = await page.evaluate(async () => {
    const sel = document.getElementById('metricSelect');
    sel.value = 'daily_ridership_wan';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 500));
    return document.getElementById('rankTitle').textContent;
  });
  record('T06a', '指标切换-日客流', t06a.includes('日客流量') && t06a.includes('万人次'), t06a);

  // T06b: 切换运营里程
  const t06b = await page.evaluate(async () => {
    const sel = document.getElementById('metricSelect');
    sel.value = 'operating_mileage_km';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 500));
    return document.getElementById('rankTitle').textContent;
  });
  record('T06b', '指标切换-运营里程', t06b.includes('运营里程') && t06b.includes('km'), t06b);

  // T06c: 切换运营站点
  const t06c = await page.evaluate(async () => {
    const sel = document.getElementById('metricSelect');
    sel.value = 'operating_stations';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 500));
    return document.getElementById('rankTitle').textContent;
  });
  record('T06c', '指标切换-运营站点', t06c.includes('运营站点') && t06c.includes('座'), t06c);

  // T06d: 切换客流强度
  const t06d = await page.evaluate(async () => {
    const sel = document.getElementById('metricSelect');
    sel.value = 'ridership_intensity';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 500));
    return document.getElementById('rankTitle').textContent;
  });
  record('T06d', '指标切换-客流强度', t06d.includes('客流强度'), t06d);

  // 恢复默认
  await page.evaluate(() => {
    const sel = document.getElementById('metricSelect');
    sel.value = 'daily_ridership_wan';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await wait(500);

  // T07a: Top 10
  const t07a = await page.evaluate(async () => {
    const sel = document.getElementById('topNSelect');
    sel.value = '10';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1000));
    const el = document.getElementById('chartRank');
    const chart = echarts.getInstanceByDom(el);
    if (!chart) return { cities: [] };
    const opt = chart.getOption();
    return { cities: opt.yAxis && opt.yAxis[0] ? opt.yAxis[0].data : [] };
  });
  record('T07a', 'Top 10 排行图', t07a.cities.length > 0 && t07a.cities.length <= 10,
    `count=${t07a.cities.length}`);

  // T07b: Top 20
  const t07b = await page.evaluate(async () => {
    const sel = document.getElementById('topNSelect');
    sel.value = '20';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1000));
    const el = document.getElementById('chartRank');
    const chart = echarts.getInstanceByDom(el);
    if (!chart) return { cities: [] };
    const opt = chart.getOption();
    return { cities: opt.yAxis && opt.yAxis[0] ? opt.yAxis[0].data : [] };
  });
  record('T07b', 'Top 20 排行图', t07b.cities.length > 10 && t07b.cities.length <= 20,
    `count=${t07b.cities.length}`);

  // T07c: 全部
  const t07c = await page.evaluate(async () => {
    const sel = document.getElementById('topNSelect');
    sel.value = '0';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1000));
    const el = document.getElementById('chartRank');
    const chart = echarts.getInstanceByDom(el);
    if (!chart) return { cities: [] };
    const opt = chart.getOption();
    return { cities: opt.yAxis && opt.yAxis[0] ? opt.yAxis[0].data : [] };
  });
  record('T07c', '全部显示排行图', t07c.cities.length > 20,
    `count=${t07c.cities.length}`);

  // 恢复默认
  await page.evaluate(() => {
    const sel = document.getElementById('topNSelect');
    sel.value = '10';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await wait(500);

  // T08: 城市详情（厦门）
  const t08 = await page.evaluate(() => {
    const xiamen = DATA.find(d => d.city === 'xiamen');
    if (!xiamen) return { ok: false, detail: 'xiamen not in DATA' };
    if (typeof showCityDetail !== 'function') return { ok: false, detail: 'showCityDetail not found' };
    showCityDetail(xiamen);
    const content = document.getElementById('detailContent').innerHTML;
    const has98 = content.includes('98.4');
    const has74 = content.includes('74');
    const has88 = content.includes('88.9') || content.includes('88.87');
    return { ok: has98 && has74 && has88, has98, has74, has88, snippet: content.substring(0, 300) };
  });
  record('T08', '城市详情-厦门（98.4km/74座/88.9万）', t08.ok, t08.detail || `has98=${t08.has98} has74=${t08.has74} has88=${t08.has88}`);

  // T09: 缺失日客流显示"暂无数据"
  const t09 = await page.evaluate(() => {
    const noData = DATA.find(d => d.daily_ridership_wan <= 0);
    if (!noData) return { ok: false, detail: 'no zero-rider city', city: '' };
    showCityDetail(noData);
    const content = document.getElementById('detailContent').innerHTML;
    const hasNoData = content.includes('暂无数据');
    return { ok: hasNoData, city: noData.city, snippet: content.substring(0, 200) };
  });
  record('T09', '缺失日客流显示"暂无数据"', t09.ok, t09.city || t09.detail || '');

  // T10: 375px 移动端无横向滚动
  await page.setViewport({ width: 375, height: 812 });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(3000);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  record('T10', '375px 移动端无横向滚动', scrollWidth <= 400, `scrollWidth=${scrollWidth}`);

  // 恢复视口
  await page.setViewport({ width: 1280, height: 800 });
  await wait(500);

  // T11: 最终控制台检查
  const finalErrors = consoleErrors.filter(isCriticalError);
  record('T11', '全程控制台无关键错误', finalErrors.length === 0,
    finalErrors.length === 0 ? '' : finalErrors.map(e => e.substring(0, 80)).join('; '));
}

// === 主流程 ===
async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    console.error('[ERROR] Chrome not found. Set PUPPETEER_EXECUTABLE_PATH or CHROME_PATH.');
    process.exit(1);
  }
  console.log(`Chrome: ${chromePath}`);

  if (!fs.existsSync(DASHBOARD)) {
    console.error(`[ERROR] dashboard.html not found: ${DASHBOARD}`);
    process.exit(1);
  }

  let server = null;
  let browser = null;

  try {
    server = await startServer(PORT);
    console.log(`Static server started on port ${PORT}`);

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
    console.log('Running dashboard acceptance tests...');
    console.log('');

    await runTests(`http://localhost:${PORT}/dashboard.html`);

  } catch (e) {
    console.error(`[ERROR] ${e.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    await stopServer(server);
    console.log('Browser and server stopped.');
  }

  // === 输出汇总 ===
  console.log('');
  console.log('='.repeat(55));
  console.log('  Dashboard Acceptance Results');
  console.log('='.repeat(55));

  const passCount = results.filter(r => r.pass).length;
  const failCount = results.filter(r => !r.pass).length;

  for (const r of results) {
    const mark = r.pass ? 'PASS' : 'FAIL';
    console.log(`  ${mark}  ${r.id.padEnd(5)} ${r.desc}`);
  }

  console.log('-'.repeat(55));
  console.log(`  Total: ${results.length}  PASS: ${passCount}  FAIL: ${failCount}`);
  console.log('='.repeat(55));

  if (failCount > 0) {
    console.log('Result: FAIL');
    process.exit(1);
  } else {
    console.log('Result: PASS');
    process.exit(0);
  }
}

main();
