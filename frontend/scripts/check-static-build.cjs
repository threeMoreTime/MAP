/**
 * React 静态构建检查脚本
 * 检查 frontend/dist 是否满足静态部署要求
 */
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const assetsDir = path.join(distDir, 'assets');
const dataDir = path.join(distDir, 'data', 'latest');

const results = [];

function check(id, description, fn) {
  try {
    const passed = fn();
    results.push({ id, description, passed, reason: '' });
  } catch (err) {
    results.push({ id, description, passed: false, reason: err.message });
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

function readFileContent(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function walkDir(dir, exts) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

// T01: dist/index.html exists
check('T01', 'dist index exists', () => {
  return fileExists(path.join(distDir, 'index.html'));
});

// T02: dist/assets directory exists
check('T02', 'dist assets exists', () => {
  return dirExists(assetsDir);
});

// T03: data/latest three JSONs exist
check('T03', 'data latest files exist', () => {
  const required = ['metro_stats.json', 'city_assets_index.json', 'manifest.json'];
  for (const name of required) {
    if (!fileExists(path.join(dataDir, name))) {
      throw new Error(`Missing ${name}`);
    }
  }
  return true;
});

// T04: china.json exists
check('T04', 'china geojson exists', () => {
  return fileExists(path.join(assetsDir, 'china.json'));
});

// T05: index.html does not use root-path resources
check('T05', 'index uses relative asset paths', () => {
  const html = readFileContent(path.join(distDir, 'index.html'));
  const forbidden = [/src="\/assets\//, /href="\/assets\//, /src="\/data\//, /href="\/data\//];
  for (const pattern of forbidden) {
    if (pattern.test(html)) {
      throw new Error(`Found root-path reference matching ${pattern}`);
    }
  }
  return true;
});

// T06: Built JS/HTML do not contain hardcoded absolute data paths
check('T06', 'no absolute data paths', () => {
  const files = walkDir(distDir, ['.js', '.html']);
  const forbidden = [/["']\/data\/latest\//, /["']\/assets\/china\.json/];
  for (const file of files) {
    const content = readFileContent(file);
    for (const pattern of forbidden) {
      const match = content.match(pattern);
      if (match) {
        throw new Error(`Found absolute path ${match[0]} in ${path.relative(distDir, file)}`);
      }
    }
  }
  return true;
});

// T07: dist has JS and CSS assets
check('T07', 'js/css assets exist', () => {
  if (!dirExists(assetsDir)) {
    throw new Error('assets directory missing');
  }
  const entries = fs.readdirSync(assetsDir);
  const hasJs = entries.some((e) => e.endsWith('.js'));
  const hasCss = entries.some((e) => e.endsWith('.css'));
  if (!hasJs) throw new Error('No .js file in assets/');
  if (!hasCss) throw new Error('No .css file in assets/');
  return true;
});

// Output results
let allPassed = true;
for (const r of results) {
  const status = r.passed ? 'PASS' : 'FAIL';
  console.log(`${status} ${r.id} ${r.description}`);
  if (!r.passed) {
    console.log(`     Reason: ${r.reason}`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\nReact static build check PASS');
  process.exit(0);
} else {
  console.log('\nReact static build check FAILED');
  process.exit(1);
}
