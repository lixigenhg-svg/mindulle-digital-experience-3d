# 测试记录（无头实测基线）

测试环境：云主机 Linux，Chromium（swiftshader 软件渲染），Playwright Python；
前端 dev 端口 5190，ws 房间服端口 8123（8080 被系统 caddy 占用，本地联调用 `PORT=8123`）。

## 复跑命令

```bash
# 单人模式前端（不连 WS）
VITE_WS_URL=off npm run dev -- --port 5190 --strictPort

# 多人房间服（换空闲端口）
PORT=8123 npm run server

# 双人联调前端（指向房间服）
VITE_WS_URL=ws://127.0.0.1:8123 npm run dev -- --port 5190 --strictPort
```

探针脚本（沙箱 `/tmp`，会话结束会清空，可按下述断言重建）：
- 双视口渲染：desktop 1280×800 / mobile 390×844，收集 `pageerror` 与 console error，截图归档 `preview/`。
- 交互回归：배경音点亮 → 라이트 삼档 → 关闭弹窗 → 上香 toast → 손 모으기/예 갖추기/나무북/구슬。
- 双人同步：两个浏览器上下文同 `?room=test-01`，校验双方人数均为 2/20 且互见 avatar。

## 本轮结果（2026-11-12）

| 测试项 | 结果 | 说明 |
| --- | --- | --- |
| 桌面视口渲染 | PASS | canvas 1280×800，大殿/壁龛/莲灯/蒲团/HUD/动作栏齐全 |
| 移动视口渲染 | PASS | 390×844，布局无溢出，按钮热区完整 |
| 배경음 켜기 | PASS | 点击切到点亮态 `bg-amber-100/25`，再点关闭 |
| 体验券弹窗 | PASS | 三档 무소유 / 풀소유 / 사랑하는 이에게 齐全，中文释义在位 |
| 关闭弹窗 | PASS | 닫기 关闭后三档文本消失 |
| 上香提示 | PASS | 点击 향 올리기 弹出接入位 toast |
| 动作按钮 | PASS | 손 모으기 / 예 갖추기 / 나무북 / 구슬 均可触发，无新报错 |
| 双人同房间 | PASS | 双方 joined，人数 2/20，远端 avatar 互见 |
| 生产构建 | PASS | 709 模块，JS 1.30MB / gzip 400.8KB |
| 源码类型检查 | PASS | `tsc --noEmit` 源码 0 错误（剩余均为 node_modules 自带 d.ts 噪音） |
| 静态资源 | PASS | 3 模型位 + 3 贴图 + 8 音频（ogg/m4a）HTTP 200 |

## 已知限制与预期降级

1. **`avatar.glb` 缺失**：沙箱无授权小角色模型，加载 404 后由 ErrorBoundary 降级到内置占位体。
   控制台会出现 `Could not load ... Unexpected token '<'` 与 `SkeletalAvatar` 错误记录，属预期降级，不影响渲染。
2. **三尊塑像首为临时件**：`statue.glb` / `statue-alt/west.glb` / `bodhisattva-right.glb` 是同一枚
   CC BY 4.0 塑像首莲瓣浮雕副本，仅用于跑通 GLTF→PBR→金铜染色→阴影→环境反射链路，不是最终造像。
   正式模型覆盖同名文件即可，无需改代码。
3. **双 WebGL 上下文黑屏**：沙箱 swiftshader 同时开第二个浏览器上下文时，WebGL 画布可能不绘制（网络同步仍正常）。
   这是测试环境并发 WebGL 限制；真实浏览器每个标签页独立进程，不受影响。单上下文连 WS 渲染已验证正常。
4. **未覆盖项**：真机 iOS Safari 音频解锁、108 珠串计数、上香烟雾粒子、殿外庭院、真实支付接入，留待后续阶段。

## 2026-11-12 视觉修订后的复测（当前版本）

改动：删除三个塑像首浮雕副本 → 主塑像位改为「空龛 + 莲座 + 柔和径向光晕 + 龛内暖光」；
台座高台 0.32m → 1.0m；删除两侧空龛；整体提亮（exposure 1.32、半球光 1.15、平行光 1.55、
地板 0x9c8270、壁画 0xac9a88、龛背板 0x4a3423 + emissive 0.35）；构图收到 fov 50 / dist 5.8 /
pitch 0.34 / lookAt y 1.45；NameTag 改固定像素尺寸（13px + px-3），不再随距离放大撑出屏幕。

复跑结果：
- 双视口截图 OK（preview/desktop.png 1280×800、preview/mobile.png 390×844）。
- 控制台仍有 3 条 `Unexpected token '<'` —— 这是模型位 404 后 SPA 回退返回 index.html 被当 glTF 解析，
  属预期降级路径，ErrorBoundary 已接住，画面正常。
- `npm run build` 通过（709 模块，JS 1.30MB / gzip 400.8KB）。
- 交互回归：배경음 켜기点亮态、라이트 삼档、关闭弹窗、上香 toast、손 모으기/예 갖추기/나무북/구슬 四按钮全部通过。
