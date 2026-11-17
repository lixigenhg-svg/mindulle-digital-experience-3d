import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SkinAvatar from '../avatar/SkinAvatar';

function App() {
  const [motion, setMotion] = useState<'idle' | 'walk'>('idle');
  const [action, setAction] = useState<any>('idle');
  useEffect(() => { (window as any).__BONE__ = (m: string, a: string) => { setMotion(m as any); setAction(a); }; }, []);
  return (
    <Canvas shadows camera={{ position: [0, 0.85, 1.5], fov: 40 }} gl={{ preserveDrawingBuffer: true }} onCreated={(st)=>{ (window as any).__SCENE__ = st.scene; }}>
      <color attach="background" args={['#8a8f96']} />
      <hemisphereLight args={['#ffffff', '#444444', 2.2]} />
      <directionalLight position={[2, 4, 3]} intensity={2.6} castShadow />
      <ambientLight intensity={1.2} />
      <SkinAvatar position={[0, 0, 0]} height={1.42} motion={motion} action={action} />
      <OrbitControls target={[0, 0.72, 0]} />
    </Canvas>
  );
}
const el = document.createElement('div');
el.style.cssText = 'position:fixed;inset:0';
document.body.style.margin = '0';
document.body.appendChild(el);
createRoot(el).render(<App />);
