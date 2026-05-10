const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC = path.resolve(__dirname, '..', 'public');

const tasks = [
  { src: path.join(ROOT, 'data', 'latest'), dest: path.join(PUBLIC, 'data', 'latest') },
  { src: path.join(ROOT, 'assets', 'china.json'), dest: path.join(PUBLIC, 'assets', 'china.json') },
];

for (const task of tasks) {
  if (fs.statSync(task.src).isDirectory()) {
    fs.mkdirSync(task.dest, { recursive: true });
    const files = fs.readdirSync(task.src).filter(f => f.endsWith('.json'));
    for (const f of files) {
      fs.copyFileSync(path.join(task.src, f), path.join(task.dest, f));
    }
    console.log(`Synced ${files.length} files: ${task.src} -> ${task.dest}`);
  } else {
    const destDir = path.dirname(task.dest);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(task.src, task.dest);
    console.log(`Synced: ${task.src} -> ${task.dest}`);
  }
}

// Sync city cover images
const cityCoversSrc = path.join(ROOT, 'assets', 'city-covers');
const cityCoversDest = path.join(PUBLIC, 'assets', 'city-covers');

if (fs.existsSync(cityCoversSrc)) {
  fs.mkdirSync(cityCoversDest, { recursive: true });

  const coverFiles = fs.readdirSync(cityCoversSrc).filter(
    f => f.endsWith('.webp') || f === 'manifest.json'
  );

  for (const f of coverFiles) {
    fs.copyFileSync(path.join(cityCoversSrc, f), path.join(cityCoversDest, f));
  }

  console.log(`Synced ${coverFiles.length} city-cover files: ${cityCoversSrc} -> ${cityCoversDest}`);
} else {
  console.log('WARNING: assets/city-covers/ not found, skipping city cover sync');
}

// Sync city network/plan map images
const cityAssetsIndexPath = path.join(ROOT, 'data', 'latest', 'city_assets_index.json');
if (fs.existsSync(cityAssetsIndexPath)) {
  const indexData = JSON.parse(fs.readFileSync(cityAssetsIndexPath, 'utf-8'));
  let copiedNetwork = 0;
  let copiedPlan = 0;
  let missing = 0;

  for (const item of indexData.items) {
    if (item.has_network_map && item.network_map_path) {
      const src = path.join(ROOT, item.network_map_path);
      const dest = path.join(PUBLIC, item.network_map_path);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        copiedNetwork++;
      } else {
        console.log(`WARNING: network map missing: ${item.network_map_path}`);
        missing++;
      }
    }
    if (item.has_plan_map && item.plan_map_path) {
      const src = path.join(ROOT, item.plan_map_path);
      const dest = path.join(PUBLIC, item.plan_map_path);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        copiedPlan++;
      } else {
        console.log(`WARNING: plan map missing: ${item.plan_map_path}`);
        missing++;
      }
    }
  }

  console.log(`Synced city maps: ${copiedNetwork} network, ${copiedPlan} plan, ${missing} missing`);
} else {
  console.log('WARNING: city_assets_index.json not found, skipping city map sync');
}

console.log('Data sync complete.');
