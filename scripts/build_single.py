#!/usr/bin/env python3
"""把 dist 打包成一个可直接双击/预览的 HTML。

· 模型、贴图、音效全部内联为 data URI
· 主程序 gzip 后 base64，运行时用 DecompressionStream 解压再注入 <script>
· 离线时后端接口（/care/*.php）返回本地数据；供灯名单用示例数据，让灯排亮起来
"""
import base64, gzip, json, pathlib, re, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
TMP = ROOT / 'build_tmp'
OUT = ROOT / '单文件' / '민들레-3D-체험관.html'
TMP.mkdir(exist_ok=True)

# ---------- 1. 衍生资源：贴图缩到 600px webp、logo 转 webp、木鱼转 24k mp3 ----------
def ff(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', *args, '-y'], check=True)

jobs = [
    ('assets/tex/wall.jpg',    't2_wall.webp',    ['-vf', 'scale=600:-2', '-q:v', '80']),
    ('assets/tex/outside.jpg', 't2_outside.webp', ['-vf', 'scale=600:-2', '-q:v', '80']),
    ('assets/tex/floor.jpg',   't2_floor.webp',   ['-vf', 'scale=400:-2', '-q:v', '80']),
    ('assets/intro-logo.png',  'logo.webp',       ['-q:v', '82']),
]
for src, out, opts in jobs:
    dst = TMP / out
    if not dst.exists():
        ff('-i', str(DIST / src), *opts, str(dst))
    print('gen', out, dst.stat().st_size)

m24 = TMP / 'm24.wav'
if not m24.exists():
    ff('-i', str(DIST / 'assets/audio/drum.wav'), '-ac', '1', '-b:a', '24k', '-ar', '22050', str(m24))
print('gen m24.wav', m24.stat().st_size)

# ---------- 2. 内联清单：只收运行时真正会请求的文件 ----------
FILES = [
    ('assets/models/statue-alt/east.glb',     None,              'model/gltf-binary'),
    ('assets/models/statue-alt/west.glb',     None,              'model/gltf-binary'),
    ('assets/models/statue-alt/north.glb',     None,              'model/gltf-binary'),
    ('assets/models/avatar.glb',                  None,              'model/gltf-binary'),
    ('assets/models/avatar-alt/avatar2.glb', None,              'model/gltf-binary'),
    ('assets/tex/floor.jpg',                    TMP/'t2_floor.webp',   'image/webp'),
    ('assets/tex/outside.jpg',                  TMP/'t2_outside.webp', 'image/webp'),
    ('assets/tex/wall.jpg',                     TMP/'t2_wall.webp',    'image/webp'),
    ('assets/intro-logo.png',                   TMP/'logo.webp',       'image/webp'),
    ('assets/audio/bead_click.m4a',             None,              'audio/mp4'),
    ('assets/audio/cloth.m4a',                  None,              'audio/mp4'),
    ('assets/audio/wood_hit.m4a',           None,              'audio/mp4'),
    ('assets/audio/drum.wav',                 TMP/'m24.wav',     'audio/mpeg'),
]

res, total = {}, 0
for key, alt, mime in FILES:
    p = alt if alt else (DIST / key)
    data = pathlib.Path(p).read_bytes()
    res[key] = f'data:{mime};base64,' + base64.b64encode(data).decode()
    total += len(data)
print('内联原始资源', round(total / 1048576, 2), 'MB')

# ---------- 3. 主程序 gzip ----------
html = (DIST / 'index.html').read_text(encoding='utf-8')
js_name = re.search(r'assets/(index-[\w-]+\.js)', html).group(1)
css_name = re.search(r'assets/(index-[\w-]+\.css)', html).group(1)
js = (DIST / 'assets' / js_name).read_bytes()
css = (DIST / 'assets' / css_name).read_text(encoding='utf-8')
gz = gzip.compress(js, 9)
jsb64 = base64.b64encode(gz).decode()
print('js', len(js), '-> gz', len(gz))

# ---------- 4. 示例供灯名单（离线时让灯排亮起来） ----------
demo = [("김미영", "가족의 건강을 빕니다"), ("박정수", "어머니의 쾌유를 빕니다"),
        ("이수진", "아이의 앞날을 빕니다"), ("최영호", "사업의 번창을 빕니다"),
        ("정하늘", "마음의 평안을 빕니다"), ("한지민", "부모님의 장수를 빕니다"),
        ("오세훈", "시험의 합격을 빕니다"), ("윤서연", "소중한 이의 안녕을 빕니다"),
        ("강민재", "건강과 행복을 빕니다"), ("임지훈", "새로운 시작을 빕니다"),
        ("서지우", "가정의 화평을 빕니다"), ("노은비", "무탈한 하루를 빕니다")]
lamps = {"ok": True, "lamps": [{"name": n, "message": m, "date": "2026-11-%02d" % (i + 1)}
                               for i, (n, m) in enumerate(demo)]}
lamp_js = json.dumps(json.dumps(lamps, ensure_ascii=False), ensure_ascii=False)

# ---------- 5. 资源路径拦截 hook ----------
hook = """<script>
(function(){
var MAP=__ASSETS__;
function key(u){ if(typeof u!=='string') return ''; var i=u.indexOf('assets/'); if(i<0) return '';
  var s=u.slice(i); var q=s.search(/[?#]/); if(q>=0) s=s.slice(0,q);
  if(MAP[s]) return s; var n=s.split('/').pop(); if(!n) return '';
  for(var kk in MAP){ if(kk.split('/').pop()===n) return kk; } return s; }
function isApi(u){ return typeof u==='string' && /(^|\\/)care\\/[a-z-]+\\.php/.test(u); }
var _f=window.fetch&&window.fetch.bind(window);
if(_f){ window.fetch=function(a,b){ try{ var u=(typeof a==='string')?a:(a&&a.url)||'';
  if(isApi(u)){ var _b='[]'; if(/lamp-list\\.php/.test(u)) _b=__LAMPS__;
    return Promise.resolve(new Response(_b,{status:200,headers:{'content-type':'application/json'}})); }
  var k=key(u); if(k&&MAP[k]) return _f(MAP[k],b); }catch(e){} return _f(a,b); }; }
var _o=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){ try{ var k=key(u); if(k&&MAP[k]) arguments[1]=MAP[k]; }catch(e){} return _o.apply(this,arguments); };
try{ var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,get:function(){return d.get.call(this);},
   set:function(v){ var k=key(v); d.set.call(this,(k&&MAP[k])?MAP[k]:v); }}); }catch(e){}
try{ var m=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'src');
  Object.defineProperty(HTMLMediaElement.prototype,'src',{configurable:true,get:function(){return m.get.call(this);},
   set:function(v){ var k=key(v); m.set.call(this,(k&&MAP[k])?MAP[k]:v); }}); }catch(e){}
var _sa=Element.prototype.setAttribute;
Element.prototype.setAttribute=function(n,v){ try{ if((n==='src'||n==='href'||n==='xlink:href')&&typeof v==='string'){ var k=key(v); if(k&&MAP[k]) v=MAP[k]; } }catch(e){} return _sa.call(this,n,v); };
var _cl=document.createElement.bind(document);
document.createElement=function(t,a){ var e=_cl(t,a); if(String(t).toLowerCase()==='script'){ var _src=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
   try{ Object.defineProperty(e,'src',{configurable:true,get:function(){return _src.get.call(this);},set:function(v){ var k=key(v); _src.set.call(this,(k&&MAP[k])?MAP[k]:v); }}); }catch(x){} } return e; };
})();
</script>"""
hook = hook.replace('__ASSETS__', json.dumps(res, ensure_ascii=False)).replace('__LAMPS__', lamp_js)

loader = """<script>
(function(){
var B64="__JS__";
function go(){
  try{
    var bin=atob(B64), n=bin.length, u=new Uint8Array(n);
    for(var i=0;i<n;i++) u[i]=bin.charCodeAt(i);
    var stream=new Response(u).body.pipeThrough(new DecompressionStream('gzip'));
    new Response(stream).text().then(function(txt){
      var s=document.createElement('script'); s.textContent=txt; document.body.appendChild(s);
    }).catch(function(e){ console.error('decompress failed',e); });
  }catch(e){ console.error('boot failed',e); }
}
if(typeof DecompressionStream==='function'){ go(); }
else { console.error('DecompressionStream unsupported'); }
})();
</script>"""
loader = loader.replace('__JS__', jsb64)

# ---------- 6. 组装 ----------
html = re.sub(r'<script[^>]*src="\./assets/index-[\w-]+\.js"[^>]*></script>', '', html)
html = re.sub(r'<link[^>]*rel="stylesheet"[^>]*href="\./assets/index-[\w-]+\.css"[^>]*>',
              '<style>' + css + '</style>', html)
html = html.replace('</head>', hook + '\n</head>')
html = html.replace('</body>', loader + '\n</body>')

fav = (DIST / 'favicon.svg').read_bytes()
fav_uri = 'data:image/svg+xml;base64,' + base64.b64encode(fav).decode()
html = re.sub(r'href="\./favicon\.svg"', 'href="' + fav_uri + '"', html)

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(html, encoding='utf-8')
print('OUT', OUT, round(OUT.stat().st_size / 1048576, 2), 'MB', OUT.stat().st_size, 'bytes')
