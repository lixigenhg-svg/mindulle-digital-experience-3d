import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({ viewport: { width: 500, height: 400 } });
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(15000);
try{ await p.evaluate(()=>window.__MD__?.enter?.()); }catch(e){}
await p.waitForTimeout(3000);
const r = await p.evaluate(() => {
  const scene = window.__SCENE__; const out = [];
  scene.traverse(o => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    o.updateWorldMatrix(true, false);
    const g = o.geometry; if (!g?.boundingBox) g.computeBoundingBox?.();
    const bb = g.boundingBox.clone().applyMatrix4(o.matrixWorld);
    const h = bb.max.y - bb.min.y;
    const w = bb.max.x - bb.min.x;
    if (o.isSkinnedMesh && !o.visible) return;
    out.push({ name: o.name || o.type, sk: !!o.isSkinnedMesh, h: +h.toFixed(2), w: +w.toFixed(2), y0: +bb.min.y.toFixed(2), cx: +((bb.min.x+bb.max.x)/2).toFixed(2), cz: +((bb.min.z+bb.max.z)/2).toFixed(2) });
  });
  return out.filter(o => o.h > 0.9 && o.h < 4).sort((a,b)=>a.h-b.h).slice(0, 16);
});
console.log(JSON.stringify(r, null, 0));
await b.close();
