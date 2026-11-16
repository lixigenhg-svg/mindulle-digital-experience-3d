/**
 * WishWall.tsx —— 殿外祈愿壁 (기원의 벽)
 *
 * 把供灯时填的姓名与祈愿留言做成木牌挂在墙上，进殿的人能看见别人的心愿。
 * 数据来自 lamp-list.php（store.lampRecords，最多 12 条）：
 *   一块木牌对应一盏灯，4 列 × 3 行 = 12 块。
 *
 * 整墙只用一张 CanvasTexture（一次 draw call），比 12 个独立 mesh 便宜得多。
 * 没有数据时牌墙不空着，显示一句提示，避免看起来像坏了。
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { store } from '../store';

const WOOD_POST = new THREE.MeshStandardMaterial({ color: 0x4a2a1c, roughness: 0.88 });
const WOOD_FRAME = new THREE.MeshStandardMaterial({ color: 0x33210f, roughness: 0.85 });
const TILE_EDGE = new THREE.MeshStandardMaterial({ color: 0x3a322a, roughness: 0.92 });

const COLS = 4;
const ROWS = 3;
const CELL_W = 350;
const CELL_H = 250;

type Rec = { name: string; message: string; date: string };

/** 把一行长文本按字宽折行（韩文/中文按字断，英文按词断的近似做法） */
function wrap(g: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of Array.from(text)) {
    const next = cur + ch;
    if (g.measureText(next).width > maxW && cur !== '') {
      lines.push(cur);
      cur = ch;
      if (lines.length >= maxLines) return lines;
    } else {
      cur = next;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

/** 画一块木牌 */
function drawPlate(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  rec: Rec | null,
  mine = false,
) {
  const pad = 26;
  const w = CELL_W - pad * 2;
  const h = CELL_H - pad * 2;

  // 木牌底：竖向木纹渐变
  const grd = g.createLinearGradient(x, y, x, y + h);
  grd.addColorStop(0, '#553a1e');
  grd.addColorStop(0.45, '#4a3119');
  grd.addColorStop(1, '#3d2713');
  g.fillStyle = grd;
  g.fillRect(x, y, w, h);

  // 木纹
  g.strokeStyle = 'rgba(40,24,12,0.30)';
  g.lineWidth = 1.5;
  for (let i = 1; i < 6; i++) {
    const px = x + (w / 6) * i;
    g.beginPath();
    g.moveTo(px, y + 4);
    g.bezierCurveTo(px + 6, y + h * 0.35, px - 6, y + h * 0.7, px, y + h - 4);
    g.stroke();
  }

  // 边框
  g.strokeStyle = '#2e1c0e';
  g.lineWidth = 6;
  g.strokeRect(x + 3, y + 3, w - 6, h - 6);
  g.strokeStyle = 'rgba(206,172,112,0.42)';
  g.lineWidth = 2;
  g.strokeRect(x + 13, y + 13, w - 26, h - 26);

  if (mine) {
    // 自己供的那块：金线描边 + 角标，一眼就能找到自己的名字
    g.strokeStyle = '#f0c26a';
    g.lineWidth = 5;
    g.strokeRect(x + 9, y + 9, w - 18, h - 18);
    g.fillStyle = '#f0c26a';
    g.font = 'bold 17px serif';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText('내 메시지', x + 20, y + 18);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
  }

  if (!rec) {
    // 空位：淡淡的凹槽，表示"这块还空着"
    g.fillStyle = 'rgba(22,13,7,0.55)';
    g.fillRect(x + 16, y + 16, w - 32, h - 32);
    return;
  }

  g.textAlign = 'center';
  g.textBaseline = 'middle';

  // 姓名
  g.fillStyle = '#fbeed6';
  g.font = 'bold 40px serif';
  const nm = rec.name.slice(0, 8);
  g.fillText(nm, x + w / 2, y + 52);

  // 分隔线
  g.strokeStyle = 'rgba(206,172,112,0.40)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x + 46, y + 78);
  g.lineTo(x + w - 46, y + 78);
  g.stroke();

  // 祈愿留言（最多两行）
  const msg = (rec.message || '').trim();
  if (msg) {
    g.fillStyle = '#eddcb8';
    g.font = '24px serif';
    const lines = wrap(g, msg, w - 60, 2);
    lines.forEach((ln, i) => {
      g.fillText(ln, x + w / 2, y + 108 + i * 32);
    });
  }

  // 日期：贴最底部，与留言之间留空
  const d = (rec.date || '').slice(0, 10).replace(/-/g, '.');
  if (d) {
    g.fillStyle = '#b99b6d';
    g.font = '18px serif';
    g.fillText(d, x + w - 54, y + h - 18);
  }
}

function makeTexture(records: Rec[], myName = ''): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = CELL_W * COLS;
  c.height = CELL_H * ROWS;
  const g = c.getContext('2d')!;

  // 底板（深木色，透出一点纹理）
  g.fillStyle = '#241608';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(120,88,52,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const y = (c.height / 40) * i;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(c.width, y + (i % 2 ? 2 : -2));
    g.stroke();
  }

  const total = COLS * ROWS;
  for (let i = 0; i < total; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const rec = records[i] ?? null;
    const mine = !!rec && !!myName && rec.name.trim() === myName.trim();
    drawPlate(g, col * CELL_W, row * CELL_H, rec, mine);
  }

  // 空数据时给一句韩文提示，压在中间
  if (records.length === 0) {
    g.fillStyle = 'rgba(246,232,204,0.92)';
    g.font = 'bold 52px serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('아직 걸린 기원이 없습니다', c.width / 2, c.height / 2 - 26);
    g.fillStyle = 'rgba(226,196,138,0.85)';
    g.font = '34px serif';
    g.fillText('불빛을 밝히면 이 벽에 이름이 걸립니다', c.width / 2, c.height / 2 + 46);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** 顶部小匾「기원의 벽」 */
function WallSign() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#241a10'; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116);
    g.fillStyle = '#ecd08a'; g.font = 'bold 54px serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('기원의 벽', 256, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group position={[0, 3.30, 0.09]}>
      <mesh castShadow>
        <boxGeometry args={[1.6, 0.44, 0.05]} />
        <meshStandardMaterial color="#241a10" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[1.5, 0.39]} />
        <meshStandardMaterial map={tex} roughness={0.65} />
      </mesh>
    </group>
  );
}

export default function WishWall({
  position = [-9.6, 0, 31.5],
  rotationY = 0,
}: {
  position?: [number, number, number];
  rotationY?: number;
}) {
  const records = useSyncExternalStore(store.subscribe, () => store.hud.lampRecords);
  const me = useSyncExternalStore(store.subscribe, () => store.hud.visitorName);
  // 一屏 12 格；超过就自动轮播下一页，不必手动滚动
  const perPage = 4 * 3;
  const pages = Math.max(1, Math.ceil((records?.length ?? 0) / perPage));
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (pages <= 1) { if (page !== 0) setPage(0); return; }
    const id = window.setInterval(() => setPage((v: number) => (v + 1) % pages), 15000);
    return () => window.clearInterval(id);
  }, [pages, page]);
  const tex = useMemo(
    () => makeTexture((records as Rec[]).slice(page * perPage, page * perPage + perPage), me),
    [records, page, me],
  );
  const W = 4.9;
  const H = 2.8;

  return (
    <group position={position} rotation-y={rotationY}>
      {/* 两根立柱 */}
      {[-1, 1].map(sg => (
        <group key={sg} position={[sg * (W / 2 - 0.12), 0, 0]}>
          <mesh position={[0, 0.06, 0]} receiveShadow material={WOOD_FRAME}>
            <boxGeometry args={[0.34, 0.12, 0.34]} />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow material={WOOD_POST}>
            <boxGeometry args={[0.16, 2.78, 0.16]} />
          </mesh>
        </group>
      ))}

      {/* 檐口，防止看起来像一块悬空的板 */}
      <mesh position={[0, 3.04, 0.06]} castShadow material={TILE_EDGE}>
        <boxGeometry args={[W + 0.28, 0.12, 0.42]} />
      </mesh>

      {/* 外框 */}
      <mesh position={[0, 1.5, -0.02]} castShadow material={WOOD_FRAME}>
        <boxGeometry args={[W, H, 0.1]} />
      </mesh>

      {/* 牌墙面（贴 Canvas） */}
      <mesh position={[0, 1.5, 0.045]}>
        <planeGeometry args={[W - 0.18, H - 0.22]} />
        <meshStandardMaterial map={tex} roughness={0.78} />
      </mesh>

      <WallSign />

      {/* 地面上一盏小灯，夜里也能看清牌墙 */}
      <pointLight position={[0, 1.2, 0.7]} intensity={0.32} distance={4.2} color="#ffd9a8" />
    </group>
  );
}
