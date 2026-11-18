import { chromium } from '@playwright/test';
const FROM = Number(process.env.FROM||6), TO = Number(process.env.TO||8);
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.waitForTimeout(14000);
try { await p.click('text=법당 열기', { timeout:8000 }); } catch { localStorage.setItem('mindulle.entered','1'); await p.reload(); await p.waitForTimeout(14000); }
await p.waitForTimeout(2500);
const all = {
 6:{f:'06-기원벽.png', tp:[-4.6,29.6], cam:[4.2,0.20,-1.35]},
 7:{f:'07-석탑-마당.png', tp:[-5.4,45.5], cam:[5.0,0.22,-0.85]},
 8:{f:'08-평상-단풍.png', tp:[7.2,35.4], cam:[3.6,0.24,0.9]},
 9:{f:'09-차실.png', tp:[8.6,35.6], cam:[3.8,0.26,-1.1]},
 10:{f:'10-동승-근경.png', tp:[0,32], cam:[1.7,0.30,0]},
};
for (let i=FROM;i<=TO;i++){
  const o = all[i]; if(!o) continue;
  await p.evaluate(([x,z])=>window.__MD_TP__(x,z), o.tp);
  await p.waitForTimeout(2200);
  await p.evaluate(([d,pi,y])=>window.__MD_CAM__(d,pi,y), o.cam);
  await p.waitForTimeout(2200);
  await p.screenshot({ path:`docs/screenshots/${o.f}`, timeout:120000 });
  console.log('拍完', o.f);
}
await b.close();
