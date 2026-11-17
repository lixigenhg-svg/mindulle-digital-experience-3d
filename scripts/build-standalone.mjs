/**
 * 独立预览组装：把生产构建产物里的相对纹理路径替换为签名直链，
 * 输出 standalone/final2.js。HTML 由 assemble-html 步骤生成。
 * 运行：node scripts/build-standalone.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const TEX = {
  'assets/tex/floor.jpg': 'https://p3-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/4bf9ce0d0f24412a9f61823ea523fcf5.jpg~tplv-a9rns2rl98-image.image?lk3s=8e244e95&rcl=202611131543522EAAD3E074C1A716F9FD&rrcfp=cb23d0ed&x-expires=1795162785&x-signature=Pi4WTO0ASpqz3Yy4w8j15iLQzK8%3D',
  'assets/tex/outside.jpg': 'https://p3-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/3da56e835c7348be88da8744e161946f.jpg~tplv-a9rns2rl98-image.image?lk3s=8e244e95&rcl=202611131543522EAAD3E074C1A716F9FD&rrcfp=cb23d0ed&x-expires=1795162785&x-signature=foetuN4MMxqdi0WcM%2BwBKWlR4Bo%3D',
  'assets/tex/wall.jpg': 'https://p3-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/c674580b40024355b9891537ea3a2c75.jpg~tplv-a9rns2rl98-image.image?lk3s=8e244e95&rcl=202611131543522EAAD3E074C1A716F9FD&rrcfp=cb23d0ed&x-expires=1795162785&x-signature=r%2F79FUcb3OG0%2BeRoMEwjDj%2B3EJ4%3D',
};

const distJs = join(root, 'dist/assets/index-Bsa7yGyA.js');
let js = readFileSync(distJs, 'utf8');
for (const [rel, url] of Object.entries(TEX)) {
  const before = js.split(rel).length - 1;
  js = js.split(rel).join(url);
  console.log(`${rel}: ${before} 处替换`);
}
writeFileSync(join(root, 'standalone/final2.js'), js);
console.log('standalone/final2.js written,', js.length, 'bytes');
