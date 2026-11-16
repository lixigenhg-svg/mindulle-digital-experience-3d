/**
 * assets/probe.ts —— 模型资产清单判定
 *
 * 工程默认不分发 GLTF 模型；真实模型（主塑像 / 协侍 / 角色）放入
 * `public/assets/models/` 后，把下面对应条目置为 `true`，前端即挂载 GLTF 加载器；
 * 未置位时直接渲染程序化造像，不发起任何模型请求，避免静态托管把缺失路径
 * 回退成 HTML / 403 而产生解析报错与控制台噪音。
 *
 * 接入正版模型时：
 *   1. 按 README.txt 命名放入 public/assets/models/；
 *   2. 把对应 URL 在 MANIFEST 中改为 true；
 *   3. 如比例 / 朝向不符，再调 ExperienceScene ModelSlot 与 AvatarModel 的缩放位置。
 */

const MANIFEST: Record<string, boolean> = {
  'assets/models/statue.glb': true,
  'assets/models/bodhisattva.glb': false,
  'assets/models/avatar.glb': true,
};

export function probeModel(url: string): Promise<boolean> {
  return Promise.resolve(Boolean(MANIFEST[url]));
}
