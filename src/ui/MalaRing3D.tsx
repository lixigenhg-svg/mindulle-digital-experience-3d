import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { TOTAL_BEADS } from '../mala';

const RING_R = 1.45;
const BEAD_R = 0.064;
const TILT = -1.02;

function Beads({ beads }: { beads: number }) {
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => { invalidate(); }, [beads, invalidate]);
  const geo = useMemo(() => new THREE.SphereGeometry(BEAD_R, 18, 12), []);
  const dimMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#fffaf0'),
        metalness: 0,
        roughness: 0.055,
        transmission: 0.96,
        thickness: 0.55,
        ior: 1.62,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        attenuationColor: new THREE.Color('#cba76a'),
        attenuationDistance: 1.4,
        envMapIntensity: 2.6
      }),
    []
  );
  const litMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#ffe7bc'),
        metalness: 0,
        roughness: 0.03,
        transmission: 0.86,
        thickness: 0.5,
        ior: 1.62,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        attenuationColor: new THREE.Color('#ffb24d'),
        attenuationDistance: 0.6,
        emissive: new THREE.Color('#ff9a33'),
        emissiveIntensity: 0.95,
        envMapIntensity: 3.0
      }),
    []
  );

  const points = useMemo(
    () =>
      Array.from({ length: TOTAL_BEADS }, (_, i) => {
        const a = (i / TOTAL_BEADS) * Math.PI * 2;
        return { i, x: Math.cos(a) * RING_R, y: Math.sin(a) * RING_R };
      }),
    []
  );

  return (
    <group rotation={[TILT, 0, 0]}>
      {points.map(p => (
        <mesh
          key={p.i}
          geometry={geo}
          material={p.i < beads ? litMat : dimMat}
          position={[p.x, p.y, 0]}
        />
      ))}
    </group>
  );
}

export default function MalaRing3D({ beads }: { beads: number }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 4.9], fov: 36 }}
      style={{ pointerEvents: 'none' }}
      frameloop="demand"
    >
      <ambientLight intensity={0.28} />
      <directionalLight position={[2.4, 3.2, 4]} intensity={1.8} color="#fff2d8" />
      <pointLight position={[-3, -2, 3]} intensity={2.2} color="#ffcf92" />
      <Suspense fallback={null}>
        <Environment resolution={128} frames={1}>
          <color attach="background" args={['#0c0a06']} />
          <Lightformer form="rect" intensity={5} position={[0, 4, 3]} scale={[6, 2, 1]} color="#fff6e2" />
          <Lightformer form="rect" intensity={3.4} position={[-4, 1, 3]} scale={[2, 6, 1]} color="#ffd9a0" />
          <Lightformer form="rect" intensity={2.4} position={[4, -1, 2]} scale={[2, 4, 1]} color="#dfeaff" />
          <Lightformer form="rect" intensity={9} position={[-2.2, 1.4, 4]} scale={[0.55, 4.2, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={5} position={[2.4, -2, 3.4]} scale={[3.2, 0.5, 1]} color="#fff2d8" />
          <Lightformer form="ring" intensity={2} position={[0, -3, 2.5]} scale={3} color="#ffbf70" />
        </Environment>
      </Suspense>
      <Beads beads={beads} />
    </Canvas>
  );
}
