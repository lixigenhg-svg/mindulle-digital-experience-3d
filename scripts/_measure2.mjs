import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({ viewport: { width: 500, height: 400 } });
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(15000);
try{ await p.evaluate(()=>window.__MD__?.enter?.()); }catch(e){}
await p.waitForTimeout(3000);
const r = await p.evaluate(() => {
  const scene = window.__SCENE__; const out = [];
  let player = null;
  scene.traverse(o => {
    if (o.isSkinnedMesh && o.visible) player = o;
  });
  const bx = (o) => {
    o.updateWorldMatrix(true, false);
    const g = o.geometry; g.computeBoundingBox();
    const bb = g.boundingBox.clone().applyMatrix4(o.matrixWorld);
    return { h: +(bb.max.y - bb.min.y).toFixed(2), y0: +bb.min.y.toFixed(2) };
  };
  if (player) out.push({ tag: 'player', ...bx(player) });
  const snapped = [];
  scene.traverse(o => { if ((o.isMesh || o.isSkinnedMesh) && !o.isSkinnedMesh) snapped.push(o); });
  snapped.forEach(o => { const m = bx(o); if (m.h > 1.2 && m.h < 4) out.push({ tag: 'mesh', ...m, name: o.name }); });
  return out;
});
console.log(JSON.stringify(r));
await b.close();
