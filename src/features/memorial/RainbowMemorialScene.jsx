import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function PhotoFrame({ photo, x, scale, onOpen }) {
  const texture = useLoader(THREE.TextureLoader, photo.url);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <group position={[x, 0.75 + 0.49 * scale, 0]} scale={scale}
      onClick={event => { event.stopPropagation(); if (event.delta < 5) onOpen(photo.id); }}
      onPointerOver={event => { event.nativeEvent.target.style.cursor = 'zoom-in'; }}
      onPointerOut={event => { event.nativeEvent.target.style.cursor = ''; }}>
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

function RoomCamera({ single, controls }) {
  const { camera, gl, size, invalidate } = useThree();
  useEffect(() => {
    const angle = THREE.MathUtils.degToRad(camera.fov / 2);
    const aspect = Math.max(0.3, size.width / Math.max(1, size.height));
    const distance = Math.max(single ? 3.8 : 4.5, (single ? 0.95 : 2.9) / (Math.tan(angle) * aspect));
    camera.position.set(0, 1.2 + distance * 0.29, distance);
    controls.current.target.set(0, single ? 1.38 : 1.05, 0);
    controls.current.update();
    controls.current.saveState();
    invalidate();
  }, [camera, size.width, size.height, single, invalidate, controls]);
  return <OrbitControls ref={controls} domElement={gl.domElement}
    enablePan={false} enableZoom={false} enableDamping={false}
    minAzimuthAngle={-Math.PI / 3} maxAzimuthAngle={Math.PI / 3}
    minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 2.08} />;
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
  const allPhotos = room?.photos || [];
  const [page, setPage] = useState(0);
  const lastPage = Math.max(0, Math.ceil(allPhotos.length / 5) - 1);
  const currentPage = Math.min(page, lastPage);
  const photos = useMemo(() => allPhotos.slice(currentPage * 5, currentPage * 5 + 5), [allPhotos, currentPage]);

  const [photoId, setPhotoId] = useState(null);
  const viewer = useRef(null);
  const controls = useRef(null);
  const swipeStart = useRef(null);
  const photoIndex = allPhotos.findIndex(photo => photo.id === photoId);
  const activePhoto = allPhotos[photoIndex];

  function turnCamera(direction) {
    const orbit = controls.current;
    if (!orbit) return;
    const offset = orbit.object.position.clone().sub(orbit.target);
    const angle = THREE.MathUtils.clamp(orbit.getAzimuthalAngle() + direction * Math.PI / 9,
      orbit.minAzimuthAngle, orbit.maxAzimuthAngle);
    const position = new THREE.Spherical().setFromVector3(offset);
    position.theta = angle;
    orbit.object.position.setFromSpherical(position).add(orbit.target);
    orbit.update();
  }

  function showNeighbor(direction) {
    const next = allPhotos[photoIndex + direction];
    if (next) setPhotoId(next.id);
  }
  useEffect(() => {
    const dialog = viewer.current;
    if (activePhoto && dialog && !dialog.open) dialog.showModal();
    if (!activePhoto && dialog?.open) dialog.close();
  }, [activePhoto]);

  const positions = useMemo(() => {
    if (photos.length <= 1) return [0];
    if (photos.length === 2) return [-0.95, 0.95];
    if (photos.length === 3) return [-1.9, 0, 1.9];
    if (photos.length === 4) return [-2.1, -0.7, 0.7, 2.1];
    return [-2.1, -1.05, 0, 1.05, 2.1];
  }, [photos.length]);

  return (
    <div className="mdl-memorial-scene relative">
      <Canvas
        shadows
        style={{ touchAction: 'none' }}
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
            <PhotoFrame photo={photo} x={positions[index] || 0} scale={photos.length === 1 ? 1.4 : 1} onOpen={setPhotoId} />
          </Suspense>
        ))}

        <RoomCamera single={photos.length === 1} controls={controls} />
        <Letter name={room.petName} message={room.message} />
      </Canvas>
      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2 text-xs text-white">
        <span className="pointer-events-none rounded-full bg-slate-900/90 px-3 py-2">드래그해서 둘러보기</span>
        <button type="button" onClick={() => turnCamera(-1)}
          className="rounded-full bg-slate-900/90 px-3 py-2">왼쪽 보기</button>
        <button type="button" onClick={() => turnCamera(1)}
          className="rounded-full bg-slate-900/90 px-3 py-2">오른쪽 보기</button>
        <button type="button" onClick={() => controls.current?.reset()}
          className="rounded-full bg-slate-900/90 px-3 py-2">정면 보기</button>
      </div>
      {photos.length > 0 && (
        <div className="absolute bottom-3 right-3 flex flex-wrap justify-end gap-2">
          {lastPage > 0 && <>
            <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}
              className="rounded-full bg-slate-900/90 px-3 py-2 text-xs text-white disabled:opacity-50">이전 사진</button>
            <button type="button" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}
              className="rounded-full bg-slate-900/90 px-3 py-2 text-xs text-white disabled:opacity-50">다음 사진</button>
          </>}
          {photos.map((photo, index) => (
            <button key={photo.id} type="button" onClick={() => setPhotoId(photo.id)}
              className="rounded-full bg-slate-900/90 px-3 py-2 text-xs text-white">
              {photos.length === 1 ? '사진 크게 보기' : `사진 ${currentPage * 5 + index + 1} 크게 보기`}
            </button>
          ))}
        </div>
      )}
      <dialog ref={viewer} onClose={() => setPhotoId(null)} aria-label="추모 사진 크게 보기"
        onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            showNeighbor(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
        onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
        className="m-auto max-h-[94dvh] max-w-[96vw] rounded-xl bg-slate-900 p-3 text-white backdrop:bg-black/85">
        {activePhoto && (
          <div className="grid justify-items-center gap-2">
            <button type="button" autoFocus onClick={() => viewer.current?.close()}
              className="justify-self-end rounded-full bg-white/15 px-4 py-2 text-sm">닫기</button>
            <img src={activePhoto.url} alt={`${room.petName} 사진`}
              className="max-h-[72dvh] max-w-full object-contain touch-pan-y"
              draggable={false}
              onTouchStart={event => {
                const touch = event.touches[0];
                swipeStart.current = event.touches.length === 1 ? [touch.clientX, touch.clientY] : null;
              }}
              onTouchCancel={() => { swipeStart.current = null; }}
              onTouchEnd={event => {
                const start = swipeStart.current;
                swipeStart.current = null;
                const touch = event.changedTouches[0];
                if (!start || !touch) return;
                const dx = touch.clientX - start[0];
                if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(touch.clientY - start[1])) showNeighbor(dx < 0 ? 1 : -1);
              }} />
            {allPhotos.length > 1 && (
              <nav aria-label="사진 넘기기" className="flex items-center justify-center gap-3">
                <button type="button" disabled={photoIndex === 0} onClick={() => showNeighbor(-1)}
                  className="rounded-full bg-white/15 px-3 py-2 text-sm disabled:opacity-40">‹ 이전</button>
                <span aria-live="polite" className="text-sm">{photoIndex + 1} / {allPhotos.length}</span>
                <button type="button" disabled={photoIndex === allPhotos.length - 1} onClick={() => showNeighbor(1)}
                  className="rounded-full bg-white/15 px-3 py-2 text-sm disabled:opacity-40">다음 ›</button>
              </nav>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}

export default RainbowMemorialScene;
