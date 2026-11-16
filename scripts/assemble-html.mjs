/**
 * 生成独立预览 HTML：内联音频签名直链映射、favicon data URI，
 * JS / CSS 全部引用 byteimg 签名直链（不经短链 302，避免 CORS 拦截）。
 * 运行：node scripts/assemble-html.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const JS_URL = 'https://p3-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/772c17928b8c4db396d98ea669af6786.js?lk3s=8e244e95&rcl=20261113172439A87407A89166E834EE3D&rrcfp=cb23d0ed&x-expires=1795167041&x-signature=lQBe%2Fl2RWNvJkeis0%2FdoT0QY3%2Fs%3D';
const CSS_URL = 'https://p3-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/efced502178445799f533637ecda9bb2.css?lk3s=8e244e95&rcl=20261113172439A87407A89166E834EE3D&rrcfp=cb23d0ed&x-expires=1795167041&x-signature=ja3dRs5bHcO4zDsDG1XlKFQePKI%3D';

const AUDIO = {
  'ambient_chant.m4a': 'https://p9-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/ede9c851d815479995faab9affa51a01.m4a?lk3s=8e244e95&rcl=202611131543522EAAD3E074C1A716F9FD&rrcfp=cb23d0ed&x-expires=1795162808&x-signature=11ihdvTnUZzTqi%2B38mriu09JYm8%3D',
  'ambient_chant.ogg': 'https://p3-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/741f1e507c6f46bcb0ee6d189e5b3d05.ogg?lk3s=8e244e95&rcl=202611131543522EAAD3E074C1A716F9FD&rrcfp=cb23d0ed&x-expires=1795162808&x-signature=IWwSuG7LjcX5PklmIiCWTiHP3Sg%3D',
  'bead_click.m4a': 'https://p3-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/2c764967d23940e89f9fb2c55f004a3e.m4a?lk3s=8e244e95&rcl=202611131543522EAAD3E074C1A716F9FD&rrcfp=cb23d0ed&x-expires=1795162808&x-signature=s%2FiRq0LFCBRCgy6ZyL5CAU53i8U%3D',
  'bead_click.ogg': 'https://p3-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/3cd1c6c1ff7846c5b4f54422e5ead841.ogg?lk3s=8e244e95&rcl=202611131543522EAAD3E074C1A716F9FD&rrcfp=cb23d0ed&x-expires=1795162808&x-signature=LI0HtOpu2BVyNmh70OsrZu0Hl4V4%3D',
  'cloth.m4a': 'https://p9-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/a5ed2fc7967f4d0ea01dc35971152370.m4a?lk3s=8e244e95&rcl=202611131543522EAAD3E074C1A716F9FD&rrcfp=cb23d0ed&x-expires=1795162808&x-signature=AcfibIiMVSO8BqTVVQaINB9%2FuwI%3D',
  'cloth.ogg': 'https://p3-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/a0771c9c07f24de89541b983aa043952.ogg?lk3s=8e244e95&rcl=202611131543522EAAD3E074C1A716F9FD&rrcfp=cb23d0ed&x-expires=1795162808&x-signature=jbny8dxnl5wsvM1emRblyCIB0NY%3D',
  'woodfish_hit.m4a': 'https://p9-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/d568bb0d5b04489c969e66897ac5247d.m4a?lk3s=8e244e95&rcl=202611131543522EAAD3E074C1A716F9FD&rrcfp=cb23d0ed&x-expires=1795162808&x-signature=Ti1rkF4zAMt7ORjHBWp3ysQ2%2FMM%3D',
  'woodfish_hit.ogg': 'https://p9-flow-sign.byteimg.com/tos-cn-i-ik7evvg4ik/rc/pc/super_tool/3c60989385ad48f794904176b35482a9.ogg?lk3s=8e244e95&rcl=202611131543522EAAD3E074C1A716F9FD&rrcfp=cb23d0ed&x-expires=1795162808&x-signature=iIZ6YTJq1eXHyKgq2lzNGVqpwNc%3D',
};

// 从旧模板复用 favicon data URI
const oldHtml = readFileSync(join(root, 'standalone/final2.html'), 'utf8');
const favicon = oldHtml.match(/data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+/)?.[0] || '';

const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#171b14" />
    <link rel="icon" type="image/svg+xml" href="${favicon}" />
    <title>민들레 안심당 · Mindulle</title>
    <script>window.__MD_AUDIO__=${JSON.stringify(AUDIO)};</script>
    <script type="module" crossorigin src="${JS_URL}"></script>
    <link rel="stylesheet" crossorigin href="${CSS_URL}">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

writeFileSync(join(root, 'standalone/final2.html'), html);
console.log('standalone/final2.html written,', html.length, 'bytes; audio', Object.keys(AUDIO).length, '条');
