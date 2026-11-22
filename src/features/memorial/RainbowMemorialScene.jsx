import React, { Suspense, useMemo, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

const PAPER = '#f3ead7';
const INK = '#2d2922';
const WOOD = '#6b4a32';
const DARK_WOOD = '#3a2a1e';
const KOREAN_FONT = '"Noto Serif KR", "Apple SD Gothic Neo", "Malgun Gothic", serif';

function wrapText(context, text, maxWidth, maxLines) {
  const lines = [];
  let line = '';

  for (const character of Array.from(String(text || ''))) {
    if (character === '\n') {
      lines.push(line);
      line = '';
      if (lines.length >= maxLines) break;
      continue;
    }
    const next = line + character;
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = character;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }

  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines && Array.from(String(text || '')).length > lines.join('').length) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && context.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function createTextTexture(text, options = {}) {
  const {
    width = 1024,
    height = 512,
    font = `30px ${KOREAN_FONT}`,
    background = PAPER,
    color = INK,
    align = 'left',
    padding = 48,
    lineHeight = 44,
    maxLines = 8
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas unavailable');

  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = color;
  context.font = font;
  context.textBaseline = 'top';
  context.textAlign = 'center';
  const x = width / 2;
  const y = padding;
  const lines = wrapText(context, text, width - padding * 2, maxLines);
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function useTextTexture(text, options = {}) {
  const texture = useMemo(
    () => createTextTexture(text, options),
    [
      text,
      options.width,
      options.height,
      options.font,
      options.background,
      options.color,
      options.align,
      options.padding,
      options.lineHeight,
      options.maxLines
    ]
  );

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Photo({ url }) {
  const source = useLoader(THREE.TextureLoader, url);

  const texture = useMemo(() => {
    const cloned = source.clone();
    cloned.colorSpace = THREE.SRGBColorSpace;
    cloned.minFilter = THREE.LinearFilter;
    cloned.magFilter = THREE.LinearFilter;
    cloned.wrapS = THREE.ClampToEdgeWrapping;
    cloned.wrapT = THREE.ClampToEdgeWrapping;
    cloned.anisotropy = 4;

    const image = cloned.image;
    const sourceAspect = (image?.width || 1) / (image?.height || 1);
    const targetAspect = 3 / 4;

    if (sourceAspect > targetAspect) {
      const repeatX = targetAspect / sourceAspect;
      cloned.repeat.set(repeatX, 1);
      cloned.offset.set((1 - repeatX) / 2, 0);
    } else {
      const repeatY = sourceAspect / targetAspect;
      cloned.repeat.set(1, repeatY);
      cloned.offset.set(0, (1 - repeatY) / 2);
    }
    cloned.needsUpdate = true;
    return cloned;
  }, [source]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group>
      <mesh position={[0, 0, -0.018]} castShadow>
        <boxGeometry args={[0.62, 0.8, 0.035]} />
        <meshStandardMaterial color={DARK_WOOD} roughness={0.52} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[0.54, 0.72]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Table() {
  return (
    <group>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.75, 0.07, 0.9]} />
        <meshStandardMaterial color={WOOD} roughness={0.72} />
      </mesh>
      {[
        [-0.72, 0.35, -0.32],
        [-0.72, 0.35, 0.32],
        [0.72, 0.35, -0.32],
        [0.72, 0.35, 0.32]
      ].map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]} castShadow>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color={DARK_WOOD} roughness={0.78} />
        </mesh>
      ))}
    </group>
  );
}

function RoomShell() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#241b15" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.3, 2.5]} />
        <meshStandardMaterial color="#4a3630" roughness={1} />
      </mesh>
      <mesh position={[0, 1.35, -2.3]} receiveShadow>
        <boxGeometry args={[5, 2.7, 0.12]} />
        <meshStandardMaterial color="#3a3028" roughness={1} />
      </mesh>
      {[-2.44, 2.44].map((x, index) => (
        <mesh key={index} position={[x, 1.35, 0]} receiveShadow>
          <boxGeometry args={[0.12, 2.7, 4.6]} />
          <meshStandardMaterial color="#302720" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Sign() {
  const texture = useTextTexture('무지개다리 추모관', {
    width: 1024,
    height: 256,
    background: '#1f2b24',
    color: '#e8d9ae',
    font: `64px ${KOREAN_FONT}`,
    padding: 52,
    lineHeight: 72,
    maxLines: 2
  });

  return (
    <mesh position={[0, 2.02, -2.22]}>
      <planeGeometry args={[1.9, 0.48]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function Nameplate({ name }) {
  const texture = useTextTexture(name, {
    width: 512,
    height: 128,
    background: '#efe1c4',
    color: '#2b251e',
    font: `46px ${KOREAN_FONT}`,
    padding: 18,
    lineHeight: 52,
    maxLines: 1
  });

  return (
    <mesh position={[-0.36, 0.758, 0.27]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[0.42, 0.105]} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  );
}

function MessageCard({ message }) {
  const excerpt = String(message || '조용히 기억하고 있습니다.').slice(0, 220);
  const texture = useTextTexture(excerpt, {
    width: 1024,
    height: 720,
    background: '#f3ead7',
    color: '#302a22',
    font: `30px ${KOREAN_FONT}`,
    padding: 58,
    lineHeight: 46,
    maxLines: 11
  });

  return (
    <mesh position={[0.38, 0.758, 0.02]} rotation={[-Math.PI / 2, 0, -0.035]} receiveShadow>
      <planeGeometry args={[0.56, 0.39]} />
      <meshStandardMaterial map={texture} roughness={0.95} />
    </mesh>
  );
}

export function MemorialRoom({ memorial, onShare, shell = true, position = [0, 0, 0] }) {
  if (!memorial?.photoUrl) return null;

  return (
    <group position={position}>
      {shell ? <RoomShell /> : null}
      <Table />

      <group
        position={[-0.36, 1.15, -0.14]}
        rotation={[-0.12, 0, 0]}
        onClick={(event) => {
          event.stopPropagation();
          onShare?.();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <Photo url={memorial.photoUrl} />
      </group>

      <Nameplate name={memorial.petName || '이름 없음'} />
      <MessageCard message={memorial.message} />
      <Sign />

      <ambientLight intensity={0.48} />
      <pointLight position={[0, 2.35, 1.15]} intensity={2.2} distance={7} decay={2} color="#ffd9a0" />
      <spotLight
        position={[1.6, 2.5, 1.7]}
        angle={0.52}
        penumbra={0.85}
        intensity={2.4}
        distance={8}
        color="#fff0d0"
        castShadow
      />
    </group>
  );
}

export function MemorialCanvas({ memorial, onShare }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.55, 2.45], fov: 42, near: 0.1, far: 30 }}
      gl={{ antialias: true }}
      style={{ position: 'absolute', inset: 0 }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 1.1, -0.2);
      }}
    >
      <color attach="background" args={['#15110e']} />
      <fog attach="fog" args={['#15110e', 3, 7.5]} />
      <Suspense fallback={null}>
        <MemorialRoom memorial={memorial} onShare={onShare} />
      </Suspense>
    </Canvas>
  );
}

export function MemorialDoor({ position = [2.9, 0, -1.2], rotation = [0, -0.55, 0], onEnter }) {
  const texture = useTextTexture('무지개다리 추모관', {
    width: 1024,
    height: 256,
    background: '#1f2b24',
    color: '#e8d9ae',
    font: `48px ${KOREAN_FONT}`,
    padding: 44,
    lineHeight: 56,
    maxLines: 2
  });

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(event) => {
        event.stopPropagation();
        onEnter?.();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[1.12, 2.2, 0.12]} />
        <meshStandardMaterial color="#4a3323" roughness={0.72} />
      </mesh>
      <mesh position={[0, 2.06, 0.075]}>
        <planeGeometry args={[1.24, 0.32]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0.43, 1.03, 0.08]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#c9a75b" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}
