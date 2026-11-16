/**
 * Environment.tsx —— 程序化环境反射（零外部 HDR 资产）
 *
 * 用 three 自带 RoomEnvironment 经 PMREM 生成一套中性环境贴图，挂到 scene.environment。
 * 作用：金属/漆面/釉面材质获得真实环境反射；无环境贴图时 metalness 材质会读成黑色塑料。
 *
 * 兼容说明：three 0.160 没有场景级 scene.environmentIntensity（r163 才加入），
 * 这里改为遍历现有材质设置材质级 envMapIntensity，把环境反射压到不压过殿内暖光。
 */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export default function Environment({ intensity = 0.55 }: { intensity?: number }) {
  const gl = useThree(s => s.gl);
  const scene = useThree(s => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;

    // 0.160 无场景级强度，逐材质压 envMapIntensity
    scene.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(mm => {
        const mat = mm as THREE.MeshStandardMaterial;
        if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = intensity;
      });
    });

    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      room.dispose?.();
    };
  }, [gl, scene, intensity]);

  return null;
}
