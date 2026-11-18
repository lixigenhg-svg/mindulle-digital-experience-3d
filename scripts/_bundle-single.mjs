// 把 dist 打包成「单文件 HTML」：JS/CSS 内联，运行时素材转成 data URI（映射去重）
// 用法：node scripts/_bundle-single.mjs
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const OUT = '../temple-app-demo.html';

const MIME = {
  '.glb': 'application/octet-stream',
  '.gltf': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.hdr': 'application/octet-stream',
  '.bin': 'application/octet-stream',
};

const ALLOW = [
  'assets/models/monk.glb',
  'assets/models/buddha-new/',
  'assets/models/monk-new/xiaoheshang2.glb',
  'assets/tex/',
  'assets/textures/',
  'assets/audio/',
  'assets/intro-logo',
];

const walk = (dir) => {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
};
const rel = (p) => p.replace(/^dist\//, '').split(path.sep).join('/');
const allow = (r) => ALLOW.some((a) => (a.endsWith('/') ? r.startsWith(a) : r.startsWith(a)));

let html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

// 1) 内联 CSS
html = html.replace(/<link[^>]+rel="stylesheet"[^>]*href="(\.?\/?[^"]+)"[^>]*>/g, (m, href) => {
  const file = path.join(DIST, href.replace(/^\.?\//, ''));
  if (!fs.existsSync(file)) return m;
  return `<style>\n${fs.readFileSync(file, 'utf8')}\n</style>`;
});

// 2) 内联 JS(module)
html = html.replace(/<script[^>]+type="module"[^>]*src="(\.?\/?[^"]+)"[^>]*><\/script>/g, (m, src) => {
  const file = path.join(DIST, src.replace(/^\.?\//, ''));
  if (!fs.existsSync(file)) return m;
  return `<script type="module">\n${fs.readFileSync(file, 'utf8')}\n</script>`;
});

// 3) 素材映射（每份只内联一次）
const assetMap = {};
const audioMap = {};
let inlinedBytes = 0;
for (const f of walk(path.join(DIST, 'assets'))) {
  const r = rel(f);
  if (!allow(r)) continue;
  const ext = path.extname(f).toLowerCase();
  if (!MIME[ext]) continue;
  const buf = fs.readFileSync(f);
  const uri = `data:${MIME[ext]};base64,${buf.toString('base64')}`;
  const key = r.replace(/^assets\//, '');
  if (r.startsWith('assets/audio/')) {
    const base = path.basename(f);
    audioMap[base] = uri;
    if (/^(ambient_chant|woodfish_hit|bead_click|cloth)\.(m4a|ogg)$/.test(base)) {
      const tpl = `${base.replace(/\.(m4a|ogg)$/, '')}.{ext}`;
      if (!audioMap[tpl] || base.endsWith('.m4a')) audioMap[tpl] = uri;
    }
    continue;
  }
  inlinedBytes += buf.length;
  assetMap[key] = uri;
}

// 路径字面量 → __MD_ASSET__('key')（名字必须够独特，避免被压缩后的局部变量遮蔽）
html = html.replace(/(["'])(?:\.\/|\/)?assets\/([^"']+)\1(?!\s*:)/g, (m, q, key) => {
  if (!assetMap[key]) return m;
  return `__MD_ASSET__(${JSON.stringify(key)})`;
});

const prelude = `<script>window.__MD_ASSETS__=${JSON.stringify(assetMap)};window.__MD_AUDIO__=${JSON.stringify(audioMap)};window.__MD_ASSET__=function(k){return window.__MD_ASSETS__[k]||("assets/"+k)};</script>`;
html = html.replace('<script type="module">', prelude + '\n<script type="module">');

const outPath = path.resolve(OUT);
fs.writeFileSync(outPath, html);
console.log('inlined raw bytes:', (inlinedBytes / 1048576).toFixed(2), 'MB');
console.log('html size:', (fs.statSync(outPath).size / 1048576).toFixed(2), 'MB');
console.log('assets:', Object.keys(assetMap).length, 'audio:', Object.keys(audioMap).length);
