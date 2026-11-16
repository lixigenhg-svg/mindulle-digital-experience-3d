/**
 * 玩家动作的实时状态。
 *
 * 之前这些值是作为 props 传进 SkinAvatar 的，而它们来自 LocalPlayer 里的一个 ref：
 * ref 变化不会触发 React 重渲染，所以 SkinAvatar 一直拿到最开始的 'idle'，
 * 骨骼永远不动 —— 人在地面上平移，就是用户说的“漂移”。
 * 改成每帧直接写这个共享对象、SkinAvatar 每帧直接读，动画才真正跟着状态走。
 */
export type Motion = 'idle' | 'walk';
export type Action = 'idle' | 'praying' | 'bowing' | 'wood_hit' | 'beads' | 'sitting' | 'kowtow' | 'incense' | 'offering' | 'greet';

/** 坐下的位置种类：地面蒲团(跪坐) / 茶室坐垫(自动倒茶饮茶) / 庭院长凳(垂腿坐) */
export type SeatKind = 'floor' | 'tea' | 'bench';

export const playerMotion: { motion: Motion; action: Action; phase: number; seatKind: SeatKind } = {
  motion: 'idle',
  action: 'idle',
  phase: 0,
  seatKind: 'floor',
};
