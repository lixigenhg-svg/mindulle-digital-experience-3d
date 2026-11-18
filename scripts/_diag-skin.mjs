import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({ viewport: { width: 600, height: 500 } });
await p.goto('http://localhost:5288/skin-preview.html', { waitUntil: 'load' });
await p.waitForTimeout(5000);
const r = await p.evaluate(() => {
  const scene = window.__SCENE__;
  let sk = null;
  scene.traverse(o => { if (o.isSkinnedMesh && o.visible !== false) sk = o; });
  if (!sk) return 'none';
  const g = sk.geometry;
  const si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight'), pos = g.getAttribute('position');
  const bones = sk.skeleton.bones.map(b => b.name);
  const hist = {}; const yhist = {};
  for (let i = 0; i < pos.count; i++) {
    let best = 0, bi = 0;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > best) { best = w; bi = si.getComponent(i, k); } }
    const n = bones[bi] || '?';
    hist[n] = (hist[n] || 0) + 1;
    const y = pos.getY(i);
    const band = Math.floor(y * 4) / 4;
    yhist[band] = yhist[band] || {};
    yhist[band][n] = (yhist[band][n] || 0) + 1;
  }
  return { count: pos.count, bones, hist, yhist, bind: sk.bindMatrix.elements.slice(0,4), skeletonBones: sk.skeleton.bones.length, boneInverses: sk.skeleton.boneInverses.length };
});
console.log(JSON.stringify(r, null, 1).slice(0, 3000));
await b.close();
