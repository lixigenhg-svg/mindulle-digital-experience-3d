/**
 * NameTag.tsx —— 玩家头顶名字气泡（drei Html 挂载在 3D 场景内）
 * 格式对齐原版：绿色圆形「나」标 + 法号。
 */
import { Html } from '@react-three/drei';

export default function NameTag({ name }: { name: string }) {
  return (
    <Html center position={[0, 1.95, 0]} zIndexRange={[10, 0]}>
      <div className="flex items-center gap-1 whitespace-nowrap rounded-full bg-white/95 px-3 py-1 shadow-md">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#7a8a6a] text-[9px] font-bold text-white">
          나
        </span>
        <span className="max-w-[140px] truncate text-[13px] leading-tight text-neutral-800">{name}</span>
      </div>
    </Html>
  );
}
