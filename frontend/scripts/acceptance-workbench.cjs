/** PRD v1.1 P0 browser checks. Runs against dist under /MAP/ or a supplied BASE_URL. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const puppeteer = require("puppeteer-core");
const root = path.resolve(__dirname, "..", "dist");
const screenshots = process.env.SCREENSHOT_DIR;
const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].find((p) => fs.existsSync(p));
const results = [];
let server, browser, page;
async function step(name, action) {
  await action();
  results.push(name);
  console.log(`PASS ${name}`);
}
const waitFrame = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
async function textIncludes(text) {
  await page.waitForFunction(
    (t) => document.body.innerText.includes(t),
    { timeout: 15000 },
    text,
  );
}
async function shot(name) {
  if (screenshots) {
    await new Promise((r) => setTimeout(r, 450));
    await page.screenshot({
      path: path.join(screenshots, `${name}.png`),
      fullPage: true,
    });
  }
}
async function clickText(selector, text) {
  await page.evaluate(
    (s, t) => {
      const e = [...document.querySelectorAll(s)].find((e) =>
        e.textContent.includes(t),
      );
      if (!e) throw Error(`Missing ${s}: ${t}`);
      e.click();
    },
    selector,
    text,
  );
  await waitFrame(page);
}
async function noOverflow() {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "page has horizontal overflow",
  );
}
async function run() {
  assert(
    executablePath,
    "Set PUPPETEER_EXECUTABLE_PATH to a Chromium or Chrome executable",
  );
  if (screenshots) fs.mkdirSync(screenshots, { recursive: true });
  let base = process.env.BASE_URL;
  if (!base) {
    server = http.createServer((req, res) => {
      let relative;
      try {
        relative = decodeURIComponent(req.url.split("?")[0]).replace(
          /^\/MAP\//,
          "",
        );
      } catch {
        res.writeHead(400).end();
        return;
      }
      const filename = path.resolve(root, relative || "index.html");
      if (
        !filename.startsWith(root + path.sep) ||
        !fs.existsSync(filename) ||
        !fs.statSync(filename).isFile()
      ) {
        res.writeHead(404).end();
        return;
      }
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".webp": "image/webp",
        ".woff2": "font/woff2",
        ".svg": "image/svg+xml",
      };
      res.setHeader(
        "Content-Type",
        types[path.extname(filename)] || "application/octet-stream",
      );
      fs.createReadStream(filename).pipe(res);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}/MAP/`;
  }
  if (!base.endsWith("/")) base += "/";
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      ...JSON.parse(process.env.PUPPETEER_EXTRA_ARGS || "[]"),
    ],
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const requests = [];
  page.on("request", (req) => requests.push(req.url()));
  const go = async (route, selector) => {
    await page.goto(`${base}#${route}`, { waitUntil: "networkidle0" });
    await page.waitForSelector(selector || ".workbench");
    await waitFrame(page);
  };
  await step(
    "AC-01/05 overview coverage, compact first viewport and lazy 3D",
    async () => {
      await go("/?metric=annual&year=2025&cities=", ".overview-grid");
      await textIncludes("有效记录 34 / 50 城");
      assert.equal(
        await page.$$eval(".overview-stats strong", (els) =>
          els
            .slice(0, 3)
            .map((e) => e.innerText.trim())
            .join(","),
        ),
        "50 城,34 城,23 城",
      );
      assert(
        await page.$eval(
          ".compact-table tbody tr:nth-child(5)",
          (e) => e.getBoundingClientRect().bottom < innerHeight,
        ),
      );
      assert(
        !requests.some((url) => /echarts-gl-/.test(url)),
        "GL bundle eagerly requested",
      );
      await noOverflow();
      await shot("overview-desktop");
    },
  );
  await step(
    "AC-03/06 Hangzhou map/list selection and per-metric availability",
    async () => {
      await page.type('input[aria-label="搜索城市"]', "hangzhou");
      await textIncludes("423.52");
      await page.click(".city-name");
      await textIncludes("SELECTED CITY / HANGZHOU");
      await page.select('select[aria-label="研究指标"]', "daily_snapshot");
      await textIncludes("有效记录 0 / 1 城");
      assert(
        (await page.$eval(".selected-metric", (e) => e.innerText)).includes(
          "—",
        ),
      );
      await page.select('select[aria-label="研究指标"]', "annual");
      await textIncludes("423.52");
    },
  );
  await step(
    "AC-07 comparison basket cap, URL normalization and reload",
    async () => {
      await go(
        "/cities?metric=annual&year=2025&cities=beijing,shanghai,shenzhen,hangzhou,xiamen,chengdu,INVALID,beijing",
        ".research-table",
      );
      assert.equal(
        await page.$$eval(".tray-cities button", (els) => els.length),
        5,
      );
      await textIncludes("链接已去重并保留前 5 个有效城市");
      const disabled = await page.$$("button.basket-button:disabled");
      assert(disabled.length > 0);
      await page.reload({ waitUntil: "networkidle0" });
      assert.equal(
        await page.$$eval(".tray-cities button", (els) => els.length),
        5,
      );
    },
  );
  await step(
    "AC-07 direct-link basket survives source-page navigation and card view",
    async () => {
      await go(
        "/cities?view=cards&cities=beijing,shanghai&metric=annual&year=2025",
        ".directory-card",
      );
      assert.equal(
        await page.$$eval(".directory-card", (els) => els.length),
        50,
      );
      await page.click(".header-tools a");
      await page.waitForSelector(".reading-page");
      await clickText(".header-inner nav a", "对标分析");
      await page.waitForSelector(".comparison-row");
      assert.equal(
        await page.$$eval(".comparison-row", (els) => els.length),
        2,
      );
    },
  );
  await step(
    "AC-09/10 five-city comparison, missing values and strict gate",
    async () => {
      await go(
        "/compare?metric=daily_snapshot&cities=beijing,shanghai,shenzhen,hangzhou,xiamen",
        ".comparison-panel",
      );
      assert.equal(
        await page.$$eval(".comparison-row", (els) => els.length),
        5,
      );
      await textIncludes("当前指标缺失");
      await page.select('select[aria-label="使用方式"]', "strict");
      await textIncludes("当前资料尚不能进行严格比较");
      assert.equal(await page.$(".comparison-panel"), null);
      await clickText("button", "返回资料浏览");
      await page.select('select[aria-label="研究指标"]', "annual");
      await textIncludes("423.52");
      await shot("compare-desktop");
    },
  );
  await step(
    "AC-08/12 Xiamen archive and partial-year distinction",
    async () => {
      await go(
        "/city/xiamen?metric=annual&year=2025&cities=",
        ".city-analysis-grid",
      );
      await textIncludes("75.68");
      await clickText("summary", "查看年度原值");
      await textIncludes("完整期间待确认 · 未绘入趋势");
      await page.select('select[aria-label="研究指标"]', "daily_snapshot");
      await textIncludes("81.58");
      await clickText(".source-info summary", "指标来源");
      await textIncludes("统计时点未提供");
      await shot("archive-desktop");
    },
  );
  await step(
    "AC-13 source citation clipboard rejection has manual recovery",
    async () => {
      await page.evaluate(() =>
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async () => {
              throw Error("denied");
            },
          },
        }),
      );
      await clickText("button", "复制指标引用");
      await page.waitForSelector('textarea[aria-label="手动复制内容"]');
      const text = await page.$eval("textarea", (e) => e.value);
      for (const token of [
        "厦门",
        "81.58",
        "2026-05-08",
        "https://metrodb.org",
        "待核验",
      ])
        assert(text.includes(token));
    },
  );
  await step(
    "AC-04 no-stats city opens resources and does not invent zero mileage",
    async () => {
      await go("/city/fuzhou?cities=", ".map-archive-detail");
      await clickText('[role="tab"]', "客流分析");
      await page.waitForSelector(".operations-grid");
      assert(
        (await page.$eval(".operations-grid", (e) => e.innerText)).includes(
          "—",
        ),
      );
    },
  );
  await step(
    "AC-11 atlas, planning label, viewer zoom and fullscreen focus",
    async () => {
      await go("/maps?q=xiamen&asset=plan&cities=", ".atlas-card");
      await textIncludes("规划图表示规划方案");
      await page.click(".atlas-card");
      await page.waitForSelector(".imageArea img");
      await page.waitForFunction(
        () => document.querySelector(".imageArea img")?.naturalWidth > 0,
      );
      const before = await page.$eval(".zoomValue", (e) => e.textContent);
      await page.click('button[aria-label="放大"]');
      assert.notEqual(
        await page.$eval(".zoomValue", (e) => e.textContent),
        before,
      );
      await page.click('button[aria-label="全屏预览"]');
      await page.waitForSelector('[role="dialog"]');
      assert(
        await page.evaluate(
          () => !!document.activeElement.closest('[role="dialog"]'),
        ),
      );
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector('[role="dialog"]'),
      );
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.getAttribute("aria-label"),
        ),
        "全屏预览",
      );
    },
  );
  await step(
    "AC-19 3D switch, selected city focus, reset and 2D restore",
    async () => {
      await go(
        "/?metric=annual&year=2025&city=shanghai&cities=",
        ".research-map",
      );
      await clickText(".segmented button", "三维");
      await page.waitForFunction(() => !document.querySelector(".map-overlay"));
      await new Promise((r) => setTimeout(r, 600));
      assert.equal(
        await page.$eval(".segmented button:last-child", (e) =>
          e.getAttribute("aria-pressed"),
        ),
        "true",
        "WebGL not available in this environment",
      );
      await clickText(".map-tools button", "聚焦城市");
      await clickText(".map-tools button", "复位");
      await shot("overview-3d");
      await clickText(".segmented button", "二维");
      await page.waitForFunction(() => !document.querySelector(".map-overlay"));
      await textIncludes("SELECTED CITY / SHANGHAI");
    },
  );
  await step(
    "AC-19 WebGL loss restores 2D without losing selection",
    async () => {
      await clickText(".segmented button", "三维");
      await page.waitForFunction(() => !document.querySelector(".map-overlay"));
      await page.evaluate(() =>
        document
          .querySelector(".map-canvas canvas")
          .dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
      );
      await textIncludes("三维暂不可用，已恢复二维视图");
      await textIncludes("SELECTED CITY / SHANGHAI");
      await page.waitForFunction(
        () =>
          document
            .querySelector(".segmented button:first-child")
            .getAttribute("aria-pressed") === "true",
      );
    },
  );
  await step(
    "AC-14/20 320px mobile, all five choices and reduced motion",
    async () => {
      await page.setViewport({ width: 320, height: 800 });
      await go(
        "/compare?metric=annual&year=2025&cities=beijing,shanghai,shenzhen,hangzhou,xiamen",
        ".comparison-panel",
      );
      assert.equal(
        await page.$$eval(".comparison-row", (els) => els.length),
        5,
      );
      await noOverflow();
      await shot("compare-mobile");
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
      ]);
      await page.waitForFunction(
        () =>
          document.querySelector(".research-app").dataset.reducedMotion ===
          "true",
      );
      assert.equal(
        await page.$eval(
          ".bar-track div",
          (e) => getComputedStyle(e).transitionDuration,
        ),
        "0s",
      );
      await go("/?cities=", ".overview-grid");
      assert.equal(
        await page.$eval(".spatial-column", (e) => getComputedStyle(e).display),
        "none",
      );
      await noOverflow();
      await shot("overview-mobile");
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "no-preference" },
      ]);
    },
  );
  await step("AC-14 375px and 200% equivalent viewport coverage", async () => {
    for (const width of [375, 720]) {
      await page.setViewport({ width, height: 900 });
      for (const route of [
        "/cities?cities=",
        "/city/xiamen?cities=",
        "/maps?cities=",
        "/data-quality?cities=",
        "/about",
      ]) {
        await go(route);
        await noOverflow();
      }
    }
  });
  await step("AC-15 empty search and invalid year recovery", async () => {
    await go("/cities?q=NO_SUCH_CITY&cities=", ".research-empty");
    await textIncludes("未找到匹配城市");
    await go("/?year=9999&cities=", ".overview-grid");
    await textIncludes("年份不可用于完整年度浏览");
  });
  await step(
    "AC-15 map request failure leaves searchable table usable",
    async () => {
      const broken = await browser.newPage();
      await broken.setRequestInterception(true);
      broken.on("request", (req) =>
        req.url().includes("assets/china.json") ? req.abort() : req.continue(),
      );
      await broken.goto(`${base}#/?cities=`, { waitUntil: "networkidle0" });
      await broken.waitForFunction(() =>
        document.body.innerText.includes("空间视图加载失败"),
      );
      await broken.type('input[aria-label="搜索城市"]', "hangzhou");
      await broken.waitForFunction(() =>
        document
          .querySelector(".compact-table tbody")
          ?.innerText.includes("423.52"),
      );
      await broken.close();
    },
  );
  await step(
    "AC-15 core-data request failure provides retry without fake data",
    async () => {
      const broken = await browser.newPage();
      await broken.setRequestInterception(true);
      broken.on("request", (req) =>
        req.url().includes("metro_stats.json")
          ? req.respond({ status: 503, body: "unavailable" })
          : req.continue(),
      );
      await broken.goto(`${base}#/cities`, { waitUntil: "networkidle0" });
      await broken.waitForFunction(() =>
        document.body.innerText.includes("数据加载失败"),
      );
      assert.equal(await broken.$(".research-table"), null);
      assert(await broken.$("button"));
      await broken.close();
    },
  );
  await step(
    "AC-16 legacy routes, build identity and no runtime errors",
    async () => {
      await go("/dashboard?cities=", ".overview-grid");
      await go("/about", ".build-commit");
      assert(
        (await page.$eval(".build-commit", (e) => e.textContent)).length > 4,
      );
      assert.deepEqual(errors, []);
    },
  );
  console.log(`\n${results.length} browser checks passed (${base}).`);
}
run()
  .catch(async (error) => {
    console.error(error);
    if (page && screenshots)
      await page
        .screenshot({
          path: path.join(screenshots, "failure.png"),
          fullPage: true,
        })
        .catch(() => {});
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (server) server.close();
  });
