import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({ viewport: { width: 500, height: 500 } });
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(8000);
const r = await p.evaluate(() => {
  const out = [];
  let sk = [], sk2 = [];
  window.__SCENE__ && window.__SCENE__.traverse?.(o => {
    if (o.isSkinnedMesh) {
      const g = o.geometry; const pos = g.getAttribute('position');
      let miny = 1e9, maxy = -1e9;
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < miny) miny = y; if (y > maxy) maxy = y; }
      let s = 1, node = o.parent;
      while (node) { s *= (node.scale?.y ?? 1); node = node.parent; }
      out.push({ h: +(maxy - miny).toFixed(3), s: +s.toFixed(3), visible: o.visible, cast: o.castShadow });
    }
  });
  return out;
});
console.log(JSON.stringify(r));
await b.close();
