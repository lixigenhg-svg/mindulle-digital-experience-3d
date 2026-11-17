/**
 * names.ts —— 法号词库（나 + 形容词 + 自然名词）与袈裟配色
 * 对齐原版格式：나 느긋한 구름（我 悠闲的 云）。
 */

const NAME_ADJ = [
  '느긋한', // 悠闲的
  '다정한', // 温柔的
  '고요한', // 宁静的
  '맑은', // 清澈的
  '부드러운', // 柔和的
  '차분한', // 沉稳的
  '은은한', // 淡雅的
  '따뜻한', // 温暖的
];

const NAME_NOUN = [
  '구름', // 云
  '바람', // 风
  '물결', // 波纹
  '산들', // 山风
  '달빛', // 月光
  '이슬', // 露水
  '솔잎', // 松针
  '여울', // 浅滩
  '그림자', // 影子
  '햇살', // 阳光
];

/** 长袍配色：参考图为浅灰蓝袍 + 黄色背片，这里给出可轮换的低饱和色板 */
export const ROBE_COLORS = [
  '#b9c6cf',
  '#8a6d3b',
  '#6b7a6a',
  '#9c5a3c',
  '#7a5c6e',
  '#5f7a8a',
];

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface Identity {
  /** 完整法号，如 "나 느긋한 구름" */
  name: string;
  color: string;
}

export function makeIdentity(): Identity {
  return {
    name: `나 ${pick(NAME_ADJ)} ${pick(NAME_NOUN)}`,
    color: pick(ROBE_COLORS),
  };
}
