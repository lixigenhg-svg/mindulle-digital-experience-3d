/**
 * TeaHouse.tsx —— 庭院茶室「안심당」（차실）
 *
 * 为什么要有它：原场景的动线是「进殿 → 拜 → 走」，没有一个能坐下来的地方。
 * 茶室给访客一个停留点：可以在垫子上坐一会儿、听风、与人同坐。
 * 纯程序化建模，不依赖外部模型；位置在庭院左侧草地，避开了石道、长椅与莲池。
 *
 * 材质与尺度刻意沿用 Exterior.tsx / ExperienceScene.tsx 的取值，
 * 免得殿外和殿内像两个不同项目拼起来的。
 */
import { useMemo } from 'react';
import * as THREE from 'three';

/* ---------- 材质（数值取自既有场景，保持一致） ---------- */
const WOOD_POST = new THREE.MeshStandardMaterial({ color: 0x4a2a1c, roughness: 0.88 });
const WOOD_BEAM = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.9 });
const WOOD_TABLE = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.8 });
const TILE = new THREE.MeshStandardMaterial({ color: 0x5a5247, roughness: 0.9 });
const TILE_DEEP = new THREE.MeshStandardMaterial({ color: 0x494138, roughness: 0.93 });
const STONE = new THREE.MeshStandardMaterial({ color: 0x8a8174, roughness: 0.95 });
const PLASTER = new THREE.MeshStandardMaterial({ color: 0xa89a80, roughness: 0.97 });
const CUSHION = new THREE.MeshStandardMaterial({ color: 0xdcc9a6, roughness: 0.92 });
const CUSHION_EDGE = new THREE.MeshStandardMaterial({ color: 0xb0a184, roughness: 0.95 });
const MAT_STRAW = new THREE.MeshStandardMaterial({ color: 0xc8b183, roughness: 1 });
const PORCELAIN = new THREE.MeshStandardMaterial({ color: 0xf1ece1, roughness: 0.35, metalness: 0.02 });
const CLAY = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.7 });
const LACQUER = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.55, metalness: 0.15 });

/* ---------- 匾额「안심당」 ---------- */
function TeaPlaque() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 170;
    const g = c.getContext('2d')!;
    g.fillStyle = '#241a10'; g.fillRect(0, 0, 512, 170);
    g.strokeStyle = '#c9a24a'; g.lineWidth = 8; g.strokeRect(8, 8, 496, 154);
    g.fillStyle = '#ecd08a'; g.font = 'bold 84px serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('안심당', 256, 82);
    g.fillStyle = '#b08c4a'; g.font = '26px serif';
    g.fillText('차실', 256, 140);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group position={[0, 2.34, 2.02]}>
      <mesh castShadow>
        <boxGeometry args={[1.62, 0.58, 0.06]} />
        <meshStandardMaterial color="#241a10" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[1.5, 0.52]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ---------- 墙上挂轴（水墨小景 + 「茶」字） ---------- */
function HangingScroll({ x = 0, y = 1.45, z = -1.74 }: { x?: number; y?: number; z?: number }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 512;
    const g = c.getContext('2d')!;
    // 米色绢底
    g.fillStyle = '#e8dfc8'; g.fillRect(0, 0, 256, 512);
    // 淡墨远山
    g.fillStyle = 'rgba(70,74,66,0.30)';
    g.beginPath();
    g.moveTo(0, 300); g.quadraticCurveTo(70, 210, 128, 268);
    g.quadraticCurveTo(190, 200, 256, 280); g.lineTo(256, 340); g.lineTo(0, 340);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(50,54,48,0.24)';
    g.beginPath();
    g.moveTo(0, 350); g.quadraticCurveTo(90, 300, 160, 348);
    g.quadraticCurveTo(210, 320, 256, 356); g.lineTo(256, 400); g.lineTo(0, 400);
    g.closePath(); g.fill();
    // 墨字「茶」
    g.fillStyle = '#2b2320';
    g.font = 'bold 150px serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('차', 128, 120);
    // 落款小字
    g.fillStyle = '#5a4a38'; g.font = '24px serif';
    g.fillText('한 잔의 차', 128, 452);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group position={[x, y, z]}>
      {/* 轴杆 */}
      {[0.62, -0.62].map(dy => (
        <mesh key={dy} position={[0, dy, 0]} material={LACQUER}>
          <cylinderGeometry args={[0.028, 0.028, 0.7, 10]} />
        </mesh>
      ))}
      <mesh>
        <planeGeometry args={[0.62, 1.24]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ---------- 茶具：壶 / 杯 / 盘 ---------- */
function TeaSet() {
  return (
    <group position={[0, 0.47, 0.06]}>
      {/* 茶盘 */}
      <mesh receiveShadow material={LACQUER}>
        <boxGeometry args={[0.78, 0.025, 0.44]} />
      </mesh>
      {/* 壶身 */}
      <mesh position={[-0.16, 0.11, 0]} castShadow material={CLAY}>
        <sphereGeometry args={[0.105, 20, 16]} />
      </mesh>
      {/* 壶嘴 */}
      <mesh position={[0.02, 0.13, 0.02]} rotation-z={-0.5} castShadow material={CLAY}>
        <cylinderGeometry args={[0.018, 0.026, 0.12, 10]} />
      </mesh>
      {/* 壶把 */}
      <mesh position={[-0.27, 0.14, 0]} rotation-z={0.3} material={CLAY}>
        <torusGeometry args={[0.055, 0.014, 8, 18, Math.PI * 1.15]} />
      </mesh>
      {/* 壶盖 */}
      <mesh position={[-0.16, 0.205, 0]} material={CLAY}>
        <cylinderGeometry args={[0.045, 0.052, 0.025, 14]} />
      </mesh>
      {/* 三只茶杯 */}
      {[0.13, 0.26, 0.38].map((x, i) => (
        <group key={x} position={[x, 0.045, i === 1 ? 0.06 : -0.02]}>
          <mesh castShadow material={PORCELAIN}>
            <cylinderGeometry args={[0.046, 0.036, 0.062, 16]} />
          </mesh>
          {/* 杯内茶水 */}
          <mesh position={[0, 0.018, 0]} material={new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 0.3 })}>
            <cylinderGeometry args={[0.040, 0.034, 0.012, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- 坐垫（방석） ---------- */
function Seat({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.115, z]}>
      <mesh castShadow receiveShadow material={CUSHION}>
        <boxGeometry args={[0.62, 0.1, 0.62]} />
      </mesh>
      <mesh position={[0, 0.052, 0]} material={CUSHION_EDGE}>
        <boxGeometry args={[0.66, 0.014, 0.66]} />
      </mesh>
    </group>
  );
}

/* ---------- 小陶炉（烧水用，增氛围） ---------- */
function ClayStove({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.13, z]}>
      <mesh castShadow receiveShadow material={CLAY}>
        <cylinderGeometry args={[0.19, 0.22, 0.26, 16]} />
      </mesh>
      <mesh position={[0, 0.15, 0]} material={CLAY}>
        <cylinderGeometry args={[0.15, 0.19, 0.05, 16]} />
      </mesh>
      {/* 上面的小水壶 */}
      <mesh position={[0, 0.29, 0]} castShadow material={LACQUER}>
        <sphereGeometry args={[0.085, 16, 12]} />
      </mesh>
      <mesh position={[0.09, 0.31, 0]} rotation-z={-0.45} material={LACQUER}>
        <cylinderGeometry args={[0.014, 0.02, 0.1, 8]} />
      </mesh>
    </group>
  );
}

/* ---------- 纸灯（檐下，夜间有光） ---------- */
function PaperLamp({ x, z, y = 2.02 }: { x: number; z: number; y?: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh material={new THREE.MeshStandardMaterial({ color: 0xf6e3c0, emissive: 0xffc98a, emissiveIntensity: 0.55, roughness: 0.9 })}>
        <cylinderGeometry args={[0.1, 0.1, 0.26, 12]} />
      </mesh>
      <mesh material={LACQUER}>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 10]} />
      </mesh>
    </group>
  );
}

/**
 * 茶室本体。position 由场景挂载时给，默认放在庭院左侧草地。
 * 朝向：正面（+Z 方向，匾额所在）朝石道，方便从主路看见。
 */
export default function TeaHouse({
  position = [-11.5, 0, 44],
  rotationY = 0,
}: {
  position?: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      {/* 地基石板 */}
      <mesh position={[0, 0.045, 0]} receiveShadow material={STONE}>
        <boxGeometry args={[5.4, 0.09, 4.4]} />
      </mesh>

      {/* 四根木柱 */}
      {[-2.3, 2.3].map(x => [-1.85, 1.85].map(z => (
        <mesh key={`${x}${z}`} position={[x, 1.32, z]} castShadow material={WOOD_POST}>
          <boxGeometry args={[0.18, 2.64, 0.18]} />
        </mesh>
      )))}

      {/* 横梁 */}
      <mesh position={[0, 2.6, 1.85]} castShadow material={WOOD_BEAM}>
        <boxGeometry args={[5.0, 0.16, 0.16]} />
      </mesh>
      <mesh position={[0, 2.6, -1.85]} castShadow material={WOOD_BEAM}>
        <boxGeometry args={[5.0, 0.16, 0.16]} />
      </mesh>
      <mesh position={[-2.3, 2.6, 0]} castShadow material={WOOD_BEAM}>
        <boxGeometry args={[0.16, 0.16, 3.9]} />
      </mesh>
      <mesh position={[2.3, 2.6, 0]} castShadow material={WOOD_BEAM}>
        <boxGeometry args={[0.16, 0.16, 3.9]} />
      </mesh>

      {/* 后墙（半人高的木板墙，透出后面的树） */}
      <mesh position={[0, 1.2, -1.85]} castShadow receiveShadow material={PLASTER}>
        <boxGeometry args={[4.7, 2.4, 0.1]} />
      </mesh>

      {/* 两侧矮墙 */}
      {[-1, 1].map(sg => (
        <mesh key={sg} position={[sg * 2.3, 0.5, 0]} castShadow receiveShadow material={PLASTER}>
          <boxGeometry args={[0.1, 1.0, 3.7]} />
        </mesh>
      ))}

      {/* 屋顶：平顶 + 前后两坡瓦檐 */}
      <mesh position={[0, 2.82, 0]} castShadow receiveShadow material={TILE}>
        <boxGeometry args={[5.9, 0.16, 4.6]} />
      </mesh>
      {[-1, 1].map(sg => (
        <mesh key={sg} position={[0, 3.02, sg * 1.25]} rotation-x={-sg * 0.28} castShadow material={TILE_DEEP}>
          <boxGeometry args={[6.1, 0.1, 2.5]} />
        </mesh>
      ))}
      {/* 屋脊 */}
      <mesh position={[0, 3.16, 0]} material={TILE_DEEP}>
        <boxGeometry args={[6.2, 0.1, 0.26]} />
      </mesh>

      {/* 匾额「안심당」 */}
      <TeaPlaque />

      {/* 后墙：挂轴 + 两道木压条，避免整面白墙显得空 */}
      <HangingScroll z={-1.78} />
      {[0.72, 2.02].map(y => (
        <mesh key={y} position={[0, y, -1.79]} material={WOOD_BEAM}>
          <boxGeometry args={[4.68, 0.075, 0.05]} />
        </mesh>
      ))}
      {/* 后墙竖向木格栅 */}
      {[-1.6, -0.8, 0.8, 1.6].map(x => (
        <mesh key={x} position={[x, 1.2, -1.79]} material={WOOD_BEAM}>
          <boxGeometry args={[0.06, 2.36, 0.05]} />
        </mesh>
      ))}

      {/* 室内草席 */}
      <mesh position={[0, 0.14, 0.1]} receiveShadow material={MAT_STRAW}>
        <boxGeometry args={[2.6, 0.02, 1.8]} />
      </mesh>

      {/* 茶桌 */}
      <group position={[0, 0, 0.15]}>
        <mesh position={[0, 0.44, 0]} castShadow receiveShadow material={WOOD_TABLE}>
          <boxGeometry args={[1.55, 0.07, 0.92]} />
        </mesh>
        {[-0.62, 0.62].map(dx => [-0.36, 0.36].map(dz => (
          <mesh key={`${dx}${dz}`} position={[dx, 0.22, dz]} castShadow material={WOOD_BEAM}>
            <boxGeometry args={[0.075, 0.44, 0.075]} />
          </mesh>
        )))}
        {/* 桌沿一圈深色边 */}
        <mesh position={[0, 0.478, 0]} material={WOOD_BEAM}>
          <boxGeometry args={[1.59, 0.014, 0.96]} />
        </mesh>
      </group>

      <TeaSet />

      {/* 四个坐垫：桌两侧各两个 */}
      {[-1, 1].map(sx => [-0.92, 0.22].map(z => (
        <Seat key={`${sx}${z}`} x={sx * 1.15} z={z} />
      )))}

      {/* 陶炉放后侧 */}
      <ClayStove x={-1.55} z={-1.35} />

      {/* 檐下两只纸灯 */}
      <PaperLamp x={-2.0} z={1.7} />
      <PaperLamp x={2.0} z={1.7} />

      {/* 暖光：让茶室在傍晚也能看清，且与殿内色调一致 */}
      <pointLight position={[0, 2.1, 0.4]} intensity={0.55} distance={7} color="#ffcf9e" />
    </group>
  );
}
