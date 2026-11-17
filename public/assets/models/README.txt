模型资产位（GLTF 优先，缺失 / 加载失败时自动降级为程序化造型，塑像位不会空置）

  avatar.glb             玩家角色。骨骼动画 clip：bow_idle / pray_idle / beads_idle / chop；
                         换色依赖材质名 robe（定位材质后改 color）。
  statue.glb             中央主塑像（坐像 + 台座 + 背光，PBR 金铜材质）。
  statue-alt/            两侧塑像（east / west / north 三份，可共用）。
  avatar-alt/            备用角色模型（avatar / avatar1 / avatar2）。

【授权与署名（商用前提，不得删改）】
  塑像类模型源自 국립중앙박물관 公开藏品数据，按 공공누리 1유형（출처 표시）使用；
  署名位置：src/ui/SettingsModal.tsx 与 public/terms.html 第8条。
  角色模型源自 공유마당，作者 김용배，CC BY 4.0。

【接入方式】
  1. 把模型按上面文件名放入本目录；
  2. 在 src/assets/probe.ts 的 MANIFEST 中把对应 URL 置为 true；
  3. 重新构建即启用。模型缺失 / 解析失败时回退到 src 内程序化造型。
