import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import SkinAvatar from '../avatar/SkinAvatar';
import TeaHouse from './TeaHouse';

function Rain() {
  const streaks = useRef<THREE.LineSegments>(null);
  const drops = useMemo(() => Array.from({ length: 420 }, (_, i) => ({
    x: Math.sin(i * 131.73) * 10,
    y: (i * 0.731) % 8,
    z: (i % 3 === 0 ? 1 : -1) * (2.65 + (i * 0.317) % 14),
    speed: 4 + (i % 7) * 0.42,
  })), []);
  const positions = useMemo(() => new Float32Array(drops.length * 6), [drops]);
  useFrame((_, dt) => {
    const attribute = streaks.current?.geometry.getAttribute('position');
    if (!attribute) return;
    for (let i = 0; i < drops.length; i++) {
      const drop = drops[i];
      drop.y = (drop.y - drop.speed * Math.min(dt, 0.05) + 8) % 8;
      attribute.setXYZ(i * 2, drop.x + drop.y * 0.14, drop.y, drop.z);
      attribute.setXYZ(i * 2 + 1, drop.x + drop.y * 0.14 - 0.04, drop.y - 0.28, drop.z);
    }
    attribute.needsUpdate = true;
  });
  return (
    <lineSegments ref={streaks} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <lineBasicMaterial color="#a4bdd1" transparent opacity={0.34} depthWrite={false} />
    </lineSegments>
  );
}

export default function RainTeaScene({ purchased, guestPresent }: { purchased: boolean; guestPresent: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.4]}
      camera={{ position: purchased ? [0, 1.75, 1.65] : [6, 2.75, 8], fov: 52 }}
      onCreated={({ camera }) => camera.lookAt(0, purchased ? 0.68 : 1.4, purchased ? -0.6 : 0)}
    >
      <color attach="background" args={['#152338']} />
      <fog attach="fog" args={['#152338', 10, 31]} />
      <hemisphereLight args={['#99b6de', '#332b30', 1.1]} />
      <directionalLight position={[0, 5, 9]} color="#a5c7ff" intensity={0.8} />
      <pointLight position={[0, 2.2, 0.75]} color="#ffb962" intensity={23} distance={7} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.035}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#293635" roughness={0.68} />
      </mesh>
      {[[-4, 5], [3.5, 7], [-6, 10], [1, 12], [6, 13]].map(([x, z], i) => (
        <group key={x} position={[x, 0, -z]} scale={1 + (i % 3) * 0.24}>
          <mesh position-y={0.95}>
            <cylinderGeometry args={[0.07, 0.14, 1.9, 6]} />
            <meshStandardMaterial color="#38292a" />
          </mesh>
          {[[-0.55, 2, 0.76], [0.35, 2.38, 0.82], [0, 2.9, 0.66]].map(([dx, y, size]) => (
            <mesh key={y} position={[dx, y, 0]} scale={[1.1, 0.68, 1]}>
              <icosahedronGeometry args={[size, 1]} />
              <meshStandardMaterial color={i % 2 ? '#734c36' : '#693638'} roughness={1} flatShading />
            </mesh>
          ))}
        </group>
      ))}
      <TeaHouse position={[0, 0, 0]} openView />
      <Rain />
      {purchased && (
        <Suspense fallback={null}>
          <SkinAvatar position={[-1.15, 0.095, 0.22]} rotationY={-Math.PI / 2}
            height={1.55} live={false} action="sitting" seatKind="tea" />
          {guestPresent && <SkinAvatar position={[1.15, 0.095, 0.22]} rotationY={Math.PI / 2}
            height={1.55} live={false} action="sitting" seatKind="tea" timeShift={1.5} />}
        </Suspense>
      )}
    </Canvas>
  );
}
