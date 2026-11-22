import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TOTAL_BEADS } from '../mala';

const DISPLAY_BEADS = 24;

function makeGrain() {
  const width = 256;
  const height = 64;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x * 2 * Math.PI / width;
      const grain = Math.sin(21 * u + 1.2 * Math.sin(3 * u + y / 35))
        + 0.38 * Math.sin(46 * u + y / 20);
      const i = (y * width + x) * 4;
      pixels.set([224 + 11 * grain, 153 + 13 * grain, 85 + 10 * grain, 255], i);
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function Beads({ beads }: { beads: number }) {
  const invalidate = useThree(s => s.invalidate);
  const ring = useMemo(() => {
    const points = Array.from({ length: 48 }, (_, i) => {
      const angle = i * 2 * Math.PI / 48;
      const sin = Math.sin(angle);
      return new THREE.Vector3(0.52 * Math.cos(angle), 1.55 * Math.sign(sin) * Math.abs(sin) ** 0.75, 0);
    });
    return new THREE.CatmullRomCurve3(points, true);
  }, []);
  const grain = useMemo(makeGrain, []);
  const geometry = useMemo(() => new THREE.SphereGeometry(0.132, 24, 16), []);
  const cord = useMemo(() => new THREE.TubeGeometry(ring, 80, 0.013, 6, true), [ring]);
  useEffect(() => { invalidate(); }, [beads, invalidate]);
  useEffect(() => () => { grain.dispose(); geometry.dispose(); cord.dispose(); }, [grain, geometry, cord]);

  return (
    <group rotation={[0.06, -0.25, -0.10]}>
      <mesh geometry={cord}><meshStandardMaterial color="#9a6a3e" roughness={1} /></mesh>
      {Array.from({ length: DISPLAY_BEADS }, (_, index) => (
        <mesh
          key={index}
          geometry={geometry}
          position={ring.getPointAt((index / DISPLAY_BEADS + beads / TOTAL_BEADS) % 1)}
          rotation={[0.25, index * 0.7, 0.09 * Math.sin(index)]}
        >
          <meshStandardMaterial map={grain} color={index % 3 === 0 ? '#e2bb91' : '#fff3dd'} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

export default function MalaRing3D({ beads }: { beads: number }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 5.5], fov: 36 }}
      style={{ pointerEvents: 'none' }}
      frameloop="demand"
    >
      <hemisphereLight args={['#fff4dd', '#4c2c1b', 1.55]} />
      <directionalLight position={[-2.4, 3.2, 4]} intensity={2.4} color="#fff2db" />
      <directionalLight position={[2, -1, 1]} intensity={0.55} color="#ffd09b" />
      <Beads beads={beads} />
    </Canvas>
  );
}
