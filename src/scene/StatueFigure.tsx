/**
 * StatueFigure.tsx —— 三尊塑像的「程序化金身造像」
 *
 * 用户提供的三张塑像是 2D 渲染图，无法直接变成可旋转的三维模型；
 * 因此按参考图的形制（结跏趺坐 + 莲座 + 螺发肉髻 + 通肩袈裟）逐部件重建，
 * 只换配色与手印即可得到「蓝衣金身托钵」与「金身定印」两种。
 *
 * 坐标约定：原点在莲座底面中心，塑像面朝 +Z，站立总高约 1.95 m（莲座底 → 肉髻顶）。
 */

import { useMemo } from 'react';
import * as THREE from 'three';

export type StatuePalette = {
  /** 塑像身（面、胸、手）金属色 */
  skin: string;
  /** 袈裟主色 */
  robe: string;
  /** 袈裟暗部 */
  robeDark: string;
  /** 金饰边、莲座 */
  trim: string;
  /** 螺发 */
  hair: string;
  /** 五官线 */
  line: string;
};

export const PALETTES = {
  /** 金身定印版：通体鎏金，双手叠于腹前 */
  gold: {
    skin: '#d8a94b',
    robe: '#c8973f',
    robeDark: '#a97a2c',
    trim: '#f2d089',
    hair: '#3f5f72',
    line: '#6d4a1a',
  } as StatuePalette,
  /** 蓝金托钵版：靛蓝袈裟 + 金身，双手托钵 */
  blueGold: {
    skin: '#d8a94b',
    robe: '#2f5f92',
    robeDark: '#1e4066',
    trim: '#eec878',
    hair: '#3f6478',
    line: '#6d4a1a',
  } as StatuePalette,
  /** 金身举臂版：施无畏式举掌（备用，中央位当前用 3D 模型） */
  goldAlt: {
    skin: '#d8a94b',
    robe: '#c8973f',
    robeDark: '#a97a2c',
    trim: '#f2d089',
    hair: '#3f5f72',
    line: '#6d4a1a',
  } as StatuePalette,
} as const;

export type Mudra = 'dhyana' | 'abhaya' | 'bowl';

export type StatueFigureProps = {
  palette: StatuePalette;
  mudra?: Mudra;
  /** 整体缩放，1 = 约 1.95 m 高 */
  scale?: number;
  position?: [number, number, number];
  rotationY?: number;
  /** 莲座是否带双层莲瓣（默认 true） */
  lotus?: boolean;
};

function mats(p: StatuePalette) {
  // 鎏金质感：金属度拉满 + 清漆层 + 抬高环境反射强度，才有参考图那种饱满的油亮金
  const metal = (color: string, roughness = 0.26) =>
    new THREE.MeshPhysicalMaterial({
      color,
      metalness: 1,
      roughness,
      clearcoat: 0.45,
      clearcoatRoughness: 0.16,
      envMapIntensity: 2.1,
    });
  return {
    skin: metal(p.skin, 0.2),
    robe: metal(p.robe, 0.3),
    robeDark: metal(p.robeDark, 0.38),
    trim: metal(p.trim, 0.16),
    hair: metal(p.hair, 0.42),
    line: new THREE.MeshStandardMaterial({ color: p.line, metalness: 0.5, roughness: 0.55 }),
  };
}

type M = ReturnType<typeof mats>;

function part(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: [number, number, number],
  opts: { scale?: [number, number, number]; rot?: [number, number, number] } = {}
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (opts.scale) m.scale.set(...opts.scale);
  if (opts.rot) m.rotation.set(...opts.rot);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 莲座：底座圆盘 + 上下两圈莲瓣 + 台面 */
function lotusBase(m: M) {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.56, 0.58, 0.06, 40), m.trim, [0, 0.03, 0]));
  for (const [y, r, n, s] of [
    [0.11, 0.5, 18, 1],
    [0.24, 0.46, 18, 0.86],
  ] as const) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.add(
        part(
          new THREE.SphereGeometry(0.1, 12, 10),
          m.trim,
          [Math.cos(a) * r, y, Math.sin(a) * r],
          { scale: [s * 0.9, s * 0.5, s * 1.35], rot: [0, -a, 0] }
        )
      );
    }
  }
  g.add(part(new THREE.CylinderGeometry(0.45, 0.47, 0.05, 40), m.trim, [0, 0.33, 0]));
  g.add(part(new THREE.TorusGeometry(0.45, 0.022, 8, 40), m.robeDark, [0, 0.35, 0], { rot: [Math.PI / 2, 0, 0] }));
  return g;
}

/** 结跏趺坐的下身：盘腿、膝盖、衣摆 */
function lap(m: M) {
  const g = new THREE.Group();
  g.add(part(new THREE.SphereGeometry(1, 28, 20), m.robe, [0, 0.53, 0.02], { scale: [0.44, 0.19, 0.33] }));
  for (const x of [-1, 1]) {
    g.add(part(new THREE.SphereGeometry(1, 22, 18), m.robe, [x * 0.33, 0.5, 0.06], { scale: [0.18, 0.13, 0.18] }));
  }
  // 衣摆褶皱：三道弧带
  for (const [z, y, w] of [
    [0.3, 0.47, 0.3],
    [0.34, 0.52, 0.24],
    [0.36, 0.57, 0.18],
  ] as const) {
    g.add(part(new THREE.TorusGeometry(w, 0.022, 6, 24, Math.PI), m.robeDark, [0, y, z], { rot: [0, 0, Math.PI] }));
  }
  // 足心朝上的双足
  g.add(part(new THREE.SphereGeometry(1, 16, 12), m.skin, [-0.07, 0.6, 0.3], { scale: [0.11, 0.05, 0.13] }));
  g.add(part(new THREE.SphereGeometry(1, 16, 12), m.skin, [0.09, 0.62, 0.28], { scale: [0.11, 0.05, 0.13] }));
  return g;
}

/** 躯干与袈裟 */
function torso(m: M, robeIsSkin: boolean) {
  const g = new THREE.Group();
  // 腰腹
  g.add(part(new THREE.CylinderGeometry(0.26, 0.3, 0.42, 28), robeIsSkin ? m.skin : m.robe, [0, 0.86, 0], { scale: [1, 1, 0.82] }));
  // 胸 (略宽)
  g.add(part(new THREE.CylinderGeometry(0.31, 0.28, 0.34, 28), robeIsSkin ? m.skin : m.robe, [0, 1.24, 0], { scale: [1, 1, 0.78] }));
  // 胸口露出的塑像身（通肩袈裟的敞开处）
  if (!robeIsSkin) {
    g.add(part(new THREE.SphereGeometry(1, 22, 18), m.skin, [0, 1.14, 0.14], { scale: [0.19, 0.2, 0.12] }));
    g.add(part(new THREE.TorusGeometry(0.2, 0.018, 6, 26, Math.PI), m.trim, [0, 1.24, 0.13], { rot: [0.1, 0, Math.PI] }));
  }
  // 双肩披衣
  for (const x of [-1, 1]) {
    g.add(
      part(new THREE.SphereGeometry(1, 20, 16), robeIsSkin ? m.skin : m.robe, [x * 0.27, 1.34, 0], {
        scale: [0.16, 0.12, 0.17],
      })
    );
  }
  // 通肩斜披的衣缘（从右肩斜向左腰）
  if (!robeIsSkin) {
    g.add(
      part(new THREE.TorusGeometry(0.31, 0.026, 6, 28, Math.PI * 0.72), m.trim, [0, 1.16, 0.02], {
        rot: [Math.PI / 2, 0, -0.9],
      })
    );
  }
  return g;
}

/** 头部：肉髻、螺发、耳垂、五官 */
function head(m: M) {
  const g = new THREE.Group();
  const H = 1.52; // 头心高度
  g.add(part(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 20), m.skin, [0, 1.4, 0]));
  g.add(part(new THREE.SphereGeometry(0.152, 30, 24), m.skin, [0, H, 0], { scale: [1, 1.08, 0.96] }));
  // 耳
  for (const x of [-1, 1]) {
    g.add(
      part(new THREE.SphereGeometry(1, 16, 14), m.skin, [x * 0.152, H - 0.01, -0.005], {
        scale: [0.032, 0.082, 0.055],
      })
    );
  }
  // 肉髻（顶髻）＋ 髻珠
  g.add(part(new THREE.SphereGeometry(0.078, 20, 16), m.hair, [0, H + 0.14, -0.01], { scale: [1, 0.95, 1] }));
  g.add(part(new THREE.SphereGeometry(0.03, 12, 10), m.trim, [0, H + 0.215, 0]));
  // 螺发：三排
  for (let row = 0; row < 3; row++) {
    const y = H + 0.075 - row * 0.042;
    const n = 11 - row * 2;
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * Math.PI * 0.92 - Math.PI * 0.46;
      const rr = 0.148 - row * 0.004;
      g.add(
        part(new THREE.SphereGeometry(0.032, 10, 8), m.hair, [Math.sin(t) * rr, y, Math.cos(t) * rr * 0.86], {
          scale: [1, 0.85, 1],
        })
      );
    }
  }
  // 眉、闭眼、鼻、嘴、白毫
  for (const x of [-1, 1]) {
    g.add(part(new THREE.CapsuleGeometry(0.009, 0.045, 4, 8), m.line, [x * 0.058, H + 0.05, 0.132], { rot: [0, 0, Math.PI / 2 + x * 0.12] }));
    g.add(part(new THREE.CapsuleGeometry(0.008, 0.05, 4, 8), m.line, [x * 0.058, H + 0.018, 0.14], { rot: [0, 0, Math.PI / 2 + x * 0.26] }));
  }
  g.add(part(new THREE.SphereGeometry(1, 12, 10), m.trim, [0, H + 0.062, 0.146], { scale: [0.012, 0.012, 0.006] }));
  g.add(part(new THREE.ConeGeometry(0.02, 0.07, 10), m.skin, [0, H - 0.01, 0.152], { rot: [0.35, 0, 0] }));
  g.add(part(new THREE.SphereGeometry(1, 14, 10), m.line, [0, H - 0.072, 0.135], { scale: [0.032, 0.012, 0.01] }));
  // 背光：头后两圈金环 + 一层柔光圆盘（参考图三的头部光晕）
  const haloZ = -0.21;
  g.add(part(new THREE.TorusGeometry(0.252, 0.011, 10, 56), m.trim, [0, H + 0.015, haloZ]));
  g.add(part(new THREE.TorusGeometry(0.288, 0.006, 8, 56), m.trim, [0, H + 0.015, haloZ - 0.012]));
  const haloDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.278, 48),
    new THREE.MeshBasicMaterial({
      color: '#ffd68f',
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  haloDisc.position.set(0, H + 0.015, haloZ - 0.014);
  g.add(haloDisc);
  return g;
}

/** 手臂与手印 */
function arms(m: M, mudra: Mudra) {
  const g = new THREE.Group();
  const sleeve = m.robe;
  for (const x of [-1, 1]) {
    // 上臂
    g.add(part(new THREE.CapsuleGeometry(0.072, 0.2, 6, 14), sleeve, [x * 0.31, 1.16, 0.01], { rot: [0.1, 0, x * 0.12] }));
    g.add(part(new THREE.SphereGeometry(0.078, 14, 12), sleeve, [x * 0.34, 1.02, 0.02]));
  }

  const forearm = (x: number, from: [number, number, number], to: [number, number, number]) => {
    const dir = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const len = dir.length();
    const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, Math.max(0.02, len - 0.06), 6, 12), m.skin);
    cap.position.set(from[0] + dir.x / 2, from[1] + dir.y / 2, from[2] + dir.z / 2);
    cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    cap.castShadow = true;
    return cap;
  };

  if (mudra === 'abhaya') {
    // 右臂抬起（施无畏印），左臂落于膝上
    g.add(forearm(1, [0.34, 1.0, 0.02], [0.3, 1.02, 0.16]));
    g.add(part(new THREE.SphereGeometry(1, 18, 14), m.skin, [0.29, 1.06, 0.21], { scale: [0.055, 0.075, 0.035] }));
    g.add(forearm(-1, [-0.34, 1.0, 0.02], [-0.16, 0.78, 0.2]));
    g.add(part(new THREE.SphereGeometry(1, 18, 14), m.skin, [-0.1, 0.76, 0.23], { scale: [0.06, 0.035, 0.075] }));
  } else if (mudra === 'bowl') {
    // 双手托钵于腹前
    g.add(forearm(1, [0.34, 1.0, 0.02], [0.13, 0.8, 0.2]));
    g.add(forearm(-1, [-0.34, 1.0, 0.02], [-0.13, 0.8, 0.2]));
    g.add(part(new THREE.SphereGeometry(1, 18, 14), m.skin, [0.12, 0.78, 0.24], { scale: [0.06, 0.03, 0.07] }));
    g.add(part(new THREE.SphereGeometry(1, 18, 14), m.skin, [-0.12, 0.78, 0.24], { scale: [0.06, 0.03, 0.07] }));
    // 药钵
    g.add(part(new THREE.SphereGeometry(1, 20, 16), m.trim, [0, 0.83, 0.24], { scale: [0.1, 0.06, 0.1] }));
    g.add(part(new THREE.TorusGeometry(0.1, 0.012, 6, 24), m.trim, [0, 0.88, 0.24], { rot: [Math.PI / 2, 0, 0] }));
  } else {
    // 定印：双手叠于腹前
    g.add(forearm(1, [0.34, 1.0, 0.02], [0.1, 0.79, 0.2]));
    g.add(forearm(-1, [-0.34, 1.0, 0.02], [-0.1, 0.79, 0.2]));
    g.add(part(new THREE.SphereGeometry(1, 18, 14), m.skin, [0.04, 0.77, 0.25], { scale: [0.075, 0.028, 0.06] }));
    g.add(part(new THREE.SphereGeometry(1, 18, 14), m.skin, [-0.02, 0.8, 0.25], { scale: [0.075, 0.028, 0.06] }));
  }
  return g;
}

export default function StatueFigure({
  palette,
  mudra = 'dhyana',
  scale = 1,
  position = [0, 0, 0],
  rotationY = 0,
  lotus = true,
}: StatueFigureProps) {
  const group = useMemo(() => {
    const m = mats(palette);
    const robeIsSkin = palette.robe === palette.skin;
    const root = new THREE.Group();
    if (lotus) root.add(lotusBase(m));
    root.add(lap(m), torso(m, robeIsSkin), head(m), arms(m, mudra));
    return root;
  }, [palette, mudra, lotus]);

  return (
    <group position={position} rotation-y={rotationY} scale={scale}>
      <primitive object={group} />
    </group>
  );
}
