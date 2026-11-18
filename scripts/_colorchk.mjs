import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1200,height:800}})).newPage();
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:30000});
const r = await p.evaluate(()=>{ const out=[]; window.__SCENE__.traverse(o=>{ if(o.isMesh && !o.isSkinnedMesh){} if(o.isSkinnedMesh){ const g=o.geometry; out.push({n:o.name, hasColor:!!g.getAttribute('color'), vc:o.material.vertexColors, mat:o.material.type}); } }); return out.slice(0,6); });
console.log(JSON.stringify(r));
await b.close();
