import React, { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function PhotoFrame({ photo, x }) {
  const texture = useLoader(THREE.TextureLoader, photo.url);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <group position={[x, 1.24, 0]}>
      {/* 木框 */}
      <mesh castShadow>
        <boxGeometry args={[0.94, 1.24, 0.07]} />
        <meshStandardMaterial color="#6b4a32" roughness={0.55} metalness={0.05} />
      </mesh>
      {/* 内衬 */}
      <mesh position={[0, 0, 0.041]}>
        <planeGeometry args={[0.84, 1.14]} />
        <meshBasicMaterial color="#f4ead8" toneMapped={false} />
      </mesh>
      {/* 照片 */}
      <mesh position={[0, 0.02, 0.047]}>
        <planeGeometry args={[0.78, 1.06]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* 小名牌 */}
      <mesh position={[0, -0.58, 0.05]}>
        <planeGeometry args={[0.46, 0.1]} />
        <meshBasicMaterial color="#d9b98d" toneMapped={false} />
      </mesh>
    </group>
  );
}

function Desk() {
  return (
    <group>
      <mesh position={[0, 0.69, 0]} receiveShadow castShadow>
        <boxGeometry args={[5.8, 0.12, 2.2]} />
        <meshStandardMaterial color="#4a3022" roughness={0.45} />
      </mesh>
      {[
        [-2.55, 0.28, -0.8],
        [2.55, 0.28, -0.8],
        [-2.55, 0.28, 0.8],
        [2.55, 0.28, 0.8],
      ].map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]} castShadow>
          <boxGeometry args={[0.12, 0.56, 0.12]} />
          <meshStandardMaterial color="#3b2519" roughness={0.5} />
        </mesh>
      ))}
      {/* 桌旗 */}
      <mesh position={[0, 0.755, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 0.55]} />
        <meshBasicMaterial color="#7d2f35" toneMapped={false} />
      </mesh>
    </group>
  );
}

function EmptyHint() {
  return (
    <group position={[0, 1.55, 0]}>
      <mesh>
        <planeGeometry args={[2.8, 0.36]} />
        <meshBasicMaterial color="#16202e" toneMapped={false} />
      </mesh>
    </group>
  );
}

function RoomCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const angle = THREE.MathUtils.degToRad(camera.fov / 2);
    const aspect = Math.max(0.3, size.width / Math.max(1, size.height));
    const distance = Math.max(4.5, 2.9 / (Math.tan(angle) * aspect));
    camera.position.set(0, 1.2 + distance * 0.29, distance);
    camera.lookAt(0, 1.05, 0);
  }, [camera, size.width, size.height]);
  return null;
}

function Letter({ name, message }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 288;
    const context = canvas.getContext('2d');
    context.fillStyle = '#efe3cb';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#302a22';
    context.textAlign = 'center';
    context.font = 'bold 58px sans-serif';
    context.fillText(name, 512, 95, 930);
    context.font = '38px sans-serif';
    const lines = Array.from(String(message || '').replace(/\s+/g, ' '));
    for (let i = 0; i < 3; i++) {
      const line = lines.slice(i * 23, (i + 1) * 23).join('');
      context.fillText(line + (i === 2 && lines.length > 69 ? '…' : ''), 512, 151 + i * 48, 930);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [name, message]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 0.77, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.5, 0.42]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

export function RainbowMemorialScene({ room }) {
  const photos = useMemo(() => (room?.photos || []).slice(0, 5), [room?.photos]);

  const positions = useMemo(() => {
    if (photos.length <= 1) return [0];
    if (photos.length === 2) return [-0.95, 0.95];
    if (photos.length === 3) return [-1.9, 0, 1.9];
    if (photos.length === 4) return [-2.1, -0.7, 0.7, 2.1];
    return [-2.1, -1.05, 0, 1.05, 2.1];
  }, [photos.length]);

  return (
    <div className="mdl-memorial-scene">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [0, 2.15, 4.5], fov: 38, near: 0.1, far: 30 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0a0e17']} />
        <fog attach="fog" args={['#0a0e17', 7, 14]} />

        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow />
        <pointLight position={[-2.4, 2.2, 1.4]} intensity={1.1} color="#ffd9a8" />
        <pointLight position={[2.4, 2.2, 1.4]} intensity={0.8} color="#ffc78a" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[18, 18]} />
          <meshStandardMaterial color="#11151c" roughness={1} />
        </mesh>

        <Desk />
        {photos.length === 0 ? <EmptyHint /> : null}

        {photos.map((photo, index) => (
          <Suspense key={photo.id} fallback={null}>
            <PhotoFrame photo={photo} x={positions[index] || 0} />
          </Suspense>
        ))}

        <RoomCamera />
        <Letter name={room.petName} message={room.message} />
      </Canvas>
    </div>
  );
}

export default RainbowMemorialScene;
