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

console.log('Data sync complete.');
