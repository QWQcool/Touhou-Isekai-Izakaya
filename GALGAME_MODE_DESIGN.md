# 东方异世界居酒屋 - 独立视觉小说 (Galgame/SLG) 模式 技术设计文档

> **文档版本**：v0.1 (Draft)
> **创建日期**：2026-04-07
> **作者**：YoKONCy + Carola
> **状态**：📋 设计阶段 — 等待美术资源完成后启动开发

---

## 目录

1. [问题背景与动机](#1-问题背景与动机)
2. [核心愿景](#2-核心愿景)
3. [双轨制游玩模式](#3-双轨制游玩模式)
4. [RE6 式开局预设选择界面](#4-re6-式开局预设选择界面)
5. [新玩家引导系统重构](#5-新玩家引导系统重构)
6. [沙盒模式 UI 统一升级](#6-沙盒模式-ui-统一升级)
7. [剧情规划大师系统](#7-剧情规划大师系统)
8. [美术资源与调度架构](#8-美术资源与调度架构)
9. [全新独立 UI 体系设计](#9-全新独立-ui-体系设计)
10. [现有系统复用与解耦策略](#10-现有系统复用与解耦策略)
11. [技术实施路线图](#11-技术实施路线图)
12. [资源清单与当前进度](#12-资源清单与当前进度)
13. [附录：现有代码架构参考](#13-附录现有代码架构参考)

---

## 1. 问题背景与动机

### 1.1 当前模式的痛点

现行的"自由沙盒跑团模式"虽然质量极高（实际测试反馈：*"质量很好但是每次都得自己写剧情导致太费脑"*），但它存在根本性的体验瓶颈：

- **创作疲劳 (Creative Burnout)**：每一次行动都需要玩家亲自在输入框中绞尽脑汁、手写大段指令来推动剧情。这远超普通玩家的预期——他们期待的是"玩游戏"，而不是"当编剧"。
- **上手门槛过高**：新玩家面对一个空白输入框，往往不知道该打什么，导致前几分钟就流失。
- **缺乏视觉沉浸感**：当前的 UI 本质上是一个类似微信/QQ群聊的气泡式聊天界面。虽然做了大量装饰（和纸纹理、樱花背景），但无法承载角色立绘、场景 CG 等高密度视觉信息，与"东方 Project"这一强 IP 的美学期待存在巨大落差。
- **平面化设计的表现力瓶颈**：所有 UI 面板（状态栏、物品栏、角色列表、任务日志）采用传统的 Web 卡片式扁平排布，缺乏游戏引擎特有的"立体悬浮感"与"景深层次"。

### 1.2 与"独立模式"构想的融合

上述痛点与最初构想的"类 Galgame / Era 系独立模式"的设计目标高度吻合：

- **Galgame 的精髓**：拥有庞大且深度的文本剧情，但把极度消耗脑力的"创造行为"降到最低。玩家只需在高层做路线/行动选择（如在 Era 系中点选行动菜单、培养数值，或在 Galgame 中点选剧情分支），而非一字一句替系统编写叙事。
- **Era 系的核心循环**：从"大地图/日程表"中选择事件触发 → 阅读/体验结果 → 数值变化 → 继续选择。这个循环极其适合与我们现有的 LLM 驱动的叙事引擎深度结合。
- **因此决定**：不在现有聊天 UI 中做缝合怪式的改造，而是为 Galgame/SLG 模式**制作一套完全独立的全新 UI 体系**。

---

## 2. 核心愿景

> **一句话总结**：从"带装饰的聊天软件"蜕变为"用 Web 技术实现的、对标 Unity 开发质感的独立视觉小说 + SLG 游戏"。

### 2.1 设计哲学

| 维度 | 当前模式 (沙盒聊天) | 新模式 (Galgame/SLG) |
|---|---|---|
| **交互方式** | 自由文本输入 | 选项卡点击 + 可选自由输入 |
| **视觉风格** | 扁平化 Web 卡片 | 立体悬浮、景深分层、伪 3D 质感 |
| **信息密度** | 聊天气泡为主 | 全屏 CG + 立绘 + HUD 叠加 |
| **玩家角色** | 编剧 + 玩家 | 纯玩家（可随时升级为编剧） |
| **入门难度** | 高（需要创造力） | 极低（点点点就能玩） |
| **美术需求** | 低（头像 + 简单图标） | 极高（全套立绘差分 + 场景 CG + BGM） |

### 2.2 体验目标

玩家启动 Galgame 模式后，映入眼帘的应该是：

1. **全屏的场景背景 CG** 铺满整个视窗，配合自动播放的情景 BGM。
2. **画面中央**站着当前对话角色的高清半身立绘（带表情差分动态切换）。
3. **屏幕底部**是经典的半透明 AVG 对话框，配有角色铭牌、逐字打字机特效。
4. 剧情推进到**关键分歧点**时，屏幕中央优雅浮现 3~4 个发光的选项卡。
5. 随时可以通过快捷键或角落按钮，呼出悬浮式的**物品栏、任务面板、角色好感度面板**等 HUD 组件。
6. 所有 HUD 组件都具有**毛玻璃底板 + 多级阴影 + 微动画**的立体悬浮质感。

### 2.3 技术栈升级：引入 Three.js

为实现对标 3A 游戏引擎质感的视觉效果（如 RE6 式 3D 命运线场景、粒子特效、景深雾气等），本项目将引入 **Three.js** 作为 3D 渲染管线的基础设施：

- **定位**：Three.js **不替代** Vue 的 DOM 渲染，而是作为特定场景的**底层画布增强**。需要 3D 的场景（如开局预设选择界面、粒子天气特效）使用 `<canvas>` + Three.js；其余常规 UI 仍由 Vue + CSS 驱动。
- **集成方式**：通过 Vue 组件包裹 Three.js 的 `WebGLRenderer`，在 `onMounted` 中初始化场景，在 `onUnmounted` 中销毁资源，确保生命周期由 Vue 管控。
- **依赖包**：`three` + `@types/three`（类型支持）。可选引入手写 ShaderPass 来实现故障风 (Glitch)、色差 (Chromatic Aberration)、泛光 (Bloom) 等后处理效果。
- **性能策略**：Three.js 场景仅在需要时挂载（如进入预设选择界面），离开后立即销毁 Renderer 和纹理资源，不常驻内存。

---

## 3. 双轨制游玩模式

整个系统将支持两种完全不同的游玩模式，玩家可以在新建存档时选择，或者在游戏进行中随时切换：

### 3.1 模式 A：纯正文字跑团（沙盒模式）— 保留全量

> *"你就是造物主，每一句话都在改变幻想乡的法则。"*

- 完全保留当前的聊天 UI 和自由输入体验。
- 适合硬核跑团玩家、创作型玩家。
- 输入框始终可用；快捷回复作为辅助存在。
- 不加载立绘引擎和 AVG 对话框。

### 3.2 模式 B：视觉小说与养成（Galgame / Era 模式）— 全新开发

> *"不想费脑子？让剧情大师为您自动铺好前路地图，像玩 Era 和 AVG 一样享受故事。"*

- 使用完全独立的 `GalgameEngine.vue` 作为主渲染界面。
- 默认隐藏自由输入框，仅在需要时可通过快捷键展开（"手搓干预权"）。
- 底部以选项卡为核心交互方式。
- 全屏立绘 + 背景 CG + BGM 联动。
- HUD 面板采用 SLG 式悬浮排版。

### 3.3 切换机制

模式切换是本系统最核心的体验分流点，**入口必须放在极其显眼的位置**，让玩家第一眼就能发现并理解两种模式的区别。

#### 主入口（高可见度位置）

- **入口 1：顶部 Header 栏的模式切换按钮**
  在桌面端的顶栏（目前包含居酒屋 Logo、设置、存档管理等按钮的那一行）中，新增一个醒目的**双态切换按钮/Pill Toggle**。
  - 外观类似：`[ 📝 沙盒模式 | 🎭 Galgame模式 ]`，当前激活的一侧高亮发光。
  - 点击未激活的一侧即可瞬间切换渲染层，无需跳转页面。
  - 切换时播放一个简短的翻页/水晶音效，配合全屏 Crossfade 过渡动画（约 600ms）。

- **入口 2：移动端底部导航栏 (MobileNav)**
  在移动端的底部 Tab 栏中，新增一个独立的 Tab 图标（如 🎭 或 ✨），点击即切换到 Galgame 视图。或者将现有的某个不常用 Tab 替换为模式切换入口。

- **入口 3：新建存档向导 (`NewGameWizard.vue`)**
  在新建存档流程中，加入一个漂亮的**"选择游玩风格"步骤**，用两张对比鲜明的大卡片展示两种模式。新玩家在创建存档时就能直观感受到模式差异。玩家也可以之后随意更改。

#### 备选入口（作为设置项保留）

- **入口 4：设置面板 (`SettingsModal.vue`)**
  在设置面板的"游玩偏好"分区中，保留一个下拉菜单或 Toggle 作为模式切换的备选入口。主要服务于已经熟悉系统、想在不打断当前操作流的情况下通过设置微调的老玩家。

#### 切换的数据安全保障

- **数据层完全共享**：两种模式的底层 `GameState`、`ChatStore`、`SaveStore` 完全一致，仅视图层不同。这意味着**同一个存档可以在两种模式之间随时无缝切换，不丢失任何数据**。
- **切换时的状态快照**：每次切换模式前，自动保存当前快照，确保万无一失。

---

## 4. RE6 式开局预设选择界面

> **灵感来源**：《生化危机6 (Resident Evil 6)》的角色/章节选择界面。
> **使用场景**：仅在 **Galgame 模式下新建存档** 时出现，作为不同"开局预设/剧情路线"的选择入口。该界面遵循 Galgame 模式的独立 UI 风格体系，与沙盒模式的扁平化新建存档向导完全独立。

### 4.1 核心体验描述

在 Galgame 模式下点击"新建存档"后，玩家不是进入传统的表格式向导，而是被拉入一个**全屏的 3D 沉浸式场景**：

1. **深邃的三维虚空**：漆黑的背景中，无数发光的「命运之丝」在空间中交织延伸，代表不同剧情路线的交汇与分裂。由 Three.js 驱动的实时 `WebGLRenderer` 渲染，配合 `fog` 营造无限纵深感。
2. **角色浮岛/锚点**：每个可选的开局预设（如"博丽神社线"、"红魔馆线"、"居酒屋日常线"）对应一个在空间中悬浮的主视觉锚点——一张角色的大型半透明立绘或标志性符号（Three.js `Sprite` / `Plane`）。
3. **悬停聚焦效果**：当鼠标/光标接近某个锚点时（`Raycaster` 检测），镜头（`PerspectiveCamera`）平滑地推进（`camera.position.lerp()`），环绕该角色闪烁出专属色彩的光晕，命运之丝从四面八方向该角色汇聚。同时，叠加在 `<canvas>` 之上的 Vue DOM 浮窗显示该路线的简介文字。
4. **点击确认**：选中某个预设后，所有其他锚点的光芒骤然暗灭，被选中的角色立绘瞬间高亮充能（`UnrealBloomPass`），镜头做一个极速的前冲（Rush-in）过渡动画，画面白闪/黑切后进入真正的游戏界面。
5. **氛围音效**：低沉的环境音 + 选中时的水晶碎裂/命运线震动 SFX，通过 `audioManager` 播放。

### 4.2 技术实现方案

该场景是 Three.js 在本项目中的**首个核心应用场景**：

| 元素 | 实现方式 |
|---|---|
| 3D 虚空背景 | Three.js `Scene` + `PerspectiveCamera`，深色 `fog` 营造纵深感 |
| 命运之丝（发光线条） | Three.js `Line2` (fat lines) + 自定义 ShaderMaterial，`dashSize` 做流光动画 |
| 角色锚点 | Three.js `Sprite` 或 `Plane`，贴上角色立绘纹理，`Raycaster` 检测悬停 |
| 镜头运镜 | `camera.position.lerp()` + `camera.lookAt()` 平滑插值 |
| 后处理特效 | `EffectComposer` + `UnrealBloomPass`（泛光）+ `GlitchPass`（故障风） |
| 路线简介浮窗 | 回归 Vue DOM：绝对定位的半透明面板叠加在 `<canvas>` 之上 |
| 音效 | 复用 `services/audio.ts` 的 `audioManager` |

### 4.3 开局预设数据结构

```typescript
interface StoryPreset {
  id: string;                    // 如 'hakurei_shrine', 'scarlet_manor'
  name: string;                  // 显示名称："神社的日常"
  tagline: string;               // 副标题："与博丽灵梦的邂逅"
  description: string;           // 详细描述（悬停时显示的 2-3 行简介）
  characterId: string;           // 路线代表角色 ID（用于加载立绘纹理）
  themeColor: string;            // 主题色（如 '#FF4444' 红色）
  bgm: string;                   // 该路线的专属预览 BGM 路径
  initialOverrides?: Partial<GameState>; // 选择后叠加到 INITIAL_GAME_STATE 上的状态覆盖
}
```

预设列表由 `data/storyPresets.ts` 管理，后续可以由创作者方便地扩展新路线。

### 4.4 与存档系统的衔接

1. 玩家在 RE6 式界面中选定预设 → 系统创建新存档 (`saveStore.createSave()`)。
2. 将 `INITIAL_GAME_STATE` 与该预设的 `initialOverrides` 合并后写入初始快照。
3. 按需加载该路线对应的开场 Prompt / 世界观设定片段。
4. 无缝过渡进入 `GalgameEngine.vue` 开始游戏。

### 4.5 关键组件清单

| 组件/文件 | 职责 |
|---|---|
| `components/galgame/PresetSelector3D.vue` | RE6 式 Three.js 3D 预设选择场景的 Vue 包装器 |
| `services/three/presetScene.ts` | Three.js 场景初始化、相机控制、命运线渲染、后处理管线 |
| `data/storyPresets.ts` | 开局预设数据定义（路线名称/描述/角色/覆盖状态等） |

---

## 5. 新玩家引导系统重构

> **核心变化**：现有的 `NewPlayerGuide.vue`（红色卡片提示条 + 引导弹窗）将在未来被替换为一个**完整的类 Galgame 对话引导流程**。
> **优先级：最低（最后实施）**。在 Galgame 核心玩法和 UI 完备后再做，避免前期精力分散。

### 5.1 设计理念

初次进入网站的新玩家，不再面对一个冰冷的配置表单或弹窗提示。取而代之的是：

1. **全屏过场**：首次检测到无任何存档时，网页自动进入一个特殊的 Galgame 对话场景。
2. **看板娘引导**：一位"教程看板娘"角色（可以是原创角色或游戏内的某位 NPC）以 AVG 对话框的形式，用温暖有趣的对话和选项引导玩家完成：
   - 自我介绍 / 角色取名
   - 选择游玩模式（沙盒 vs Galgame）
   - 基础 LLM API 配置（用友好的对话语言包装技术配置步骤，降低恐惧感）
   - 简要的操作说明与世界观速览
3. **引导结束后平滑过渡**：引导对话结束后，如果玩家选择了 Galgame 模式，则直接无缝切入 RE6 式预设选择界面；如果选择沙盒模式，则进入传统的聊天界面。

### 5.2 与现有系统的关系

- 当前的 `NewPlayerGuide.vue` 和 `App.vue` 中的 `isGuideActive` 逻辑**暂时保留不动**，直到新引导系统全部完成后再替换。
- 新引导系统可以复用 Galgame 模式的 `DialogueBox.vue` 和 `SpriteLayer.vue` 组件，避免重复开发。
- 组件名称：`components/galgame/OnboardingFlow.vue`。

---

## 6. 沙盒模式 UI 统一升级

> **核心目标**：避免沙盒模式（模式A）和 Galgame 模式（模式B）的视觉风格过于割裂，确保两种模式看起来属于"同一款游戏"。

### 6.1 升级范围

在 Galgame 模式开发完成后，现有的沙盒聊天 UI 也将进行**中等幅度的视觉重制**（不改变功能逻辑，只改视觉层）：

| 组件 | 当前风格 | 升级方向 |
|---|---|---|
| **顶部 Header** | 白底 + 浅色阴影 | 深色半透明 + 毛玻璃 + 品牌 Logo 精修 |
| **聊天气泡** | 纯白/浅色卡片 | 深色渐变底板 + 微弱外发光描边 |
| **侧边栏面板** | 白色卡片平铺 | 暗色调悬浮面板 + 景深阴影 |
| **StatusCard** | 扁平化数据展示 | 加入 HUD 感的进度条/徽章/动画 |
| **输入框区域** | 标准 input 样式 | 半透明磨砂底板 + 发光聚焦描边 |
| **整体色温** | 暖白色系 | 偏向深色/暗色系（可配置明暗主题） |

### 6.2 设计约束

- **不破坏现有功能**：此次升级纯粹是 CSS / 样式层的替换，不涉及任何 Pinia Store、Service 或逻辑代码的改动。
- **共享设计语言**：两种模式共用同一套 CSS 变量 / Design Token（如阴影级别、模糊值、主题色），确保视觉语言统一。
- **渐进式执行**：可以逐个组件迭代升级，不需要一次性全部推翻。

---

## 7. Galgame 模式核心架构

### 7.1 三层 LLM 协同架构

Galgame 模式采用与沙盒模式**完全不同的 LLM 调度架构**。三个角色各司其职：

| 角色 | 复用插槽 | 调用时机 | 核心职责 |
|---|---|---|---|
| **剧情规划大师** | LLM1 (chat) | 每 10 回合 / LLM1 特殊标记强制触发 | 生成与维护全局剧情大纲（主线、伏笔网络、草蛇灰线） |
| **故事写手** | LLM1 (chat) | 每回合开始时 | 一次性生成本回合的完整「回合剧本」JSON |
| **逻辑模型** | LLM2 (logic) | 自由活动中按需 + 每回合结束 | 自定义对话、数值计算、撰写回合故事总结 |

> **关键理念**：Galgame 模式下，一个回合 ≠ 一次 LLM 对话。一个回合 = 一个完整的"小型游戏关卡"，由故事写手预编排好全部内容，前端按剧本回放。

#### 数据流全景图

```
剧情规划大师 (低频)
  │ 输出：剧情大纲 JSON
  │ 存入 galgameStore.plotOutline
  ↓
故事写手 (每回合)
  │ 输入：大纲 + 游戏状态 + 过往回合总结
  │ 输出：回合剧本 JSON (RoundScript)
  ↓
前端回放引擎 (GalgameEngine)
  │ 按剧本逐阶段渲染：开场叙事 → 自由活动 → 回合结束
  │ 自由活动中的"自定义对话"临时调用 LLM2
  ↓
逻辑模型 (每回合结束)
  │ 输入：本回合剧本 + 玩家实际行为记录
  │ 输出：数值变更 + 几百字故事总结
  │ 总结存入聊天记录（沙盒模式可见）
  ↓
推进至下一回合
```

### 7.2 回合生命周期

每个回合由三个阶段组成，前端按顺序推进：

#### 阶段 ①：开场叙事（浏览性质）

- 类似经典 Galgame 的自动播放对话/叙事段落
- 玩家只需点击推进文本，不做选择
- 用于铺设本回合的情境氛围和剧情开场
- 背景、BGM、立绘表情差分在此阶段按剧本自动切换

#### 阶段 ②：自由活动（SLG 交互）

进入类 SLG 界面，玩家可执行多种交互操作（直到主动结束本阶段）：

| 交互类型 | 触发方式 | 内容来源 | LLM 调用 |
|---|---|---|---|
| **固定对话** | 点击场景内角色立绘 | 故事写手预生成（轮流播放的几句台词） | ❌ 无 |
| **交互选项** | 点击角色后出现 | 故事写手预生成（~4 个选项 + 触发效果描述） | ❌ 无 |
| **自定义对话** | 点击角色的"自由交互"按钮 | 玩家实时输入 | ✅ LLM2 |
| **特殊事件** | 点击 UI 中的异常按钮/标记 | 故事写手预生成（遭遇战、新角色入场等） | ❌ 无 |

> **交互选项的触发效果**范围：好感度变化、金钱增减、获得符卡、接受任务/约定、进入战斗等。

> **特殊说明**：战斗场景若被触发，无论输赢，结束后直接进入下一回合。

#### 阶段 ③：回合结束 & 推进

1. 玩家主动点击"结束自由活动"按钮
2. 系统收集本回合内的所有行为记录（点了谁的什么选项、触发了什么事件、自定义对话内容等）
3. 调用 **LLM2** 执行：
   - 按需数值计算（好感度、状态变更等需要 LLM 介入的部分）
   - 撰写本回合的**故事总结**（几百字，作为后续回合的上下文参考）
4. 故事总结存入聊天记录（用户切回沙盒模式时看到的就是这份总结）
5. 检查剧情规划大师触发条件（回合计数器 ≥ 10 或 LLM1 上一次输出了强制触发标记）
6. 自动推进至回合 N+1 → 调用故事写手生成新的回合剧本

### 7.3 回合剧本 JSON Schema (RoundScript)

故事写手每回合输出一份结构化 JSON，前端根据此 JSON 逐步回放。以下为 TypeScript 接口定义：

```typescript
/** 回合剧本：故事写手 (LLM1) 每回合生成的完整数据结构 */
interface RoundScript {
  /** 回合序号 */
  round: number;
  /** 当前场景标识（对应背景图） */
  scene: string;
  /** 当前时间段 */
  time_of_day: '早晨' | '上午' | '下午' | '傍晚' | '夜晚' | '深夜';

  /** ① 开场叙事阶段 */
  opening: OpeningPhase;
  /** ② 自由活动阶段 */
  free_activity: FreeActivityPhase;
  /** 是否强制触发剧情规划大师（特殊标记） */
  force_replan: boolean;
}

/** 开场叙事：一系列按顺序播放的对话/叙事段落 */
interface OpeningPhase {
  /** 本阶段的背景图标识 */
  bg: string;
  /** 本阶段的 BGM 标识 */
  bgm: string;
  /** 对话/叙事序列，按顺序逐条播放 */
  dialogues: DialogueLine[];
}

/** 单条对话/叙事 */
interface DialogueLine {
  /** 说话角色名（null 表示旁白/叙述） */
  speaker: string | null;
  /** 角色表情标签 */
  emotion: string;
  /** 对话文本内容 */
  text: string;
  /** 可选：此条对话播放时切换背景 */
  bg?: string;
  /** 可选：此条对话播放时切换 BGM */
  bgm?: string;
}

/** 自由活动阶段 */
interface FreeActivityPhase {
  /** 本阶段的默认背景图 */
  bg: string;
  /** 本阶段的默认 BGM */
  bgm: string;
  /** 场景内可交互的角色列表 */
  characters: SceneCharacter[];
  /** 特殊事件列表（可能为空数组） */
  special_events: SpecialEvent[];
}

/** 场景内的可交互角色 */
interface SceneCharacter {
  /** 角色名（对应立绘目录名） */
  name: string;
  /** 角色在场景中的默认表情 */
  default_emotion: string;
  /** 固定对话台词（轮流循环播放） */
  idle_dialogues: string[];
  /** 交互选项列表（~4 个） */
  interactions: Interaction[];
  /** 是否允许自定义对话（调用 LLM2） */
  allow_custom_chat: boolean;
}

/** 单个交互选项 */
interface Interaction {
  /** 选项显示文本 */
  label: string;
  /** 选项类型标记，前端据此显示不同图标/颜色 */
  type: 'dialogue' | 'action' | 'gift' | 'quest' | 'combat' | 'special';
  /** 选择后播放的对话序列 */
  result_dialogues: DialogueLine[];
  /** 选择后的数值效果列表 */
  effects: Effect[];
}

/** 交互触发的效果 */
interface Effect {
  /** 效果类型 */
  type: 'affection' | 'money' | 'hp' | 'mp' | 'item' | 'spellcard'
      | 'quest_trigger' | 'combat_trigger' | 'promise' | 'custom';
  /** 效果目标（角色名、物品名等） */
  target?: string;
  /** 数值变化量（正数加/负数减） */
  value?: number;
  /** 效果描述（用于 Toast 提示） */
  description: string;
}

/** 特殊事件 */
interface SpecialEvent {
  /** 事件唯一 ID */
  id: string;
  /** UI 上显示的按钮文本 */
  button_label: string;
  /** 按钮的视觉风格提示 */
  button_style: 'warning' | 'mysterious' | 'urgent' | 'festive';
  /** 触发后播放的对话/叙事序列 */
  result_dialogues: DialogueLine[];
  /** 触发后的效果列表 */
  effects: Effect[];
}
```

#### 回合剧本示例（简化版）

```json
{
  "round": 3,
  "scene": "izakaya_interior",
  "time_of_day": "傍晚",
  "opening": {
    "bg": "izakaya_interior_evening",
    "bgm": "daily_peaceful",
    "dialogues": [
      { "speaker": null, "emotion": "", "text": "夕阳透过居酒屋的窗户洒进来，为室内镀上一层温暖的橘色。" },
      { "speaker": "今泉影狼", "emotion": "常规", "text": "老板，今天的客人好像特别多呢。" },
      { "speaker": null, "emotion": "", "text": "你点了点头，开始准备今晚的食材。" }
    ]
  },
  "free_activity": {
    "bg": "izakaya_interior_evening",
    "bgm": "daily_peaceful",
    "characters": [
      {
        "name": "今泉影狼",
        "default_emotion": "常规",
        "idle_dialogues": [
          "今天想吃什么呢~",
          "外面的月亮好圆啊...",
          "老板有空的话，能帮我看一下这个吗？"
        ],
        "interactions": [
          {
            "label": "聊聊今天的生意",
            "type": "dialogue",
            "result_dialogues": [
              { "speaker": "今泉影狼", "emotion": "高兴", "text": "今天来了好多客人呢！特别是那个红白巫女，喝了三碗味增汤！" }
            ],
            "effects": [
              { "type": "affection", "target": "今泉影狼", "value": 1, "description": "影狼好感度 +1" }
            ]
          },
          {
            "label": "赠送烤肉串",
            "type": "gift",
            "result_dialogues": [
              { "speaker": "今泉影狼", "emotion": "高兴", "text": "哇！是烤肉！谢谢老板！（尾巴疯狂摇摆）" }
            ],
            "effects": [
              { "type": "affection", "target": "今泉影狼", "value": 3, "description": "影狼好感度 +3" },
              { "type": "money", "value": -50, "description": "消耗 50 金" }
            ]
          }
        ],
        "allow_custom_chat": true
      }
    ],
    "special_events": [
      {
        "id": "mysterious_customer",
        "button_label": "？？？ 门外传来奇怪的敲门声",
        "button_style": "mysterious",
        "result_dialogues": [
          { "speaker": null, "emotion": "", "text": "你打开门，发现门外站着一个穿着黑色斗篷的少女。" },
          { "speaker": "键山雏", "emotion": "害羞", "text": "那个...请问这里是居酒屋吗？我...我能进来避避雨吗？" }
        ],
        "effects": [
          { "type": "custom", "description": "键山雏加入当前场景" }
        ]
      }
    ]
  },
  "force_replan": false
}
```

### 7.4 剧情规划大师

#### 职责

剧情规划大师是一个**低频运行的宏观编剧**，不参与具体的回合叙事，只维护一份"剧情大纲"文档供故事写手参考。

#### 输出格式：剧情大纲 JSON

```typescript
interface PlotOutline {
  /** 大纲版本号（每次更新递增） */
  version: number;
  /** 当前主线阶段描述 */
  main_arc: string;
  /** 未来 5~10 回合的剧情发展脉络 */
  upcoming_beats: StoryBeat[];
  /** 活跃伏笔网络 */
  foreshadows: Foreshadow[];
  /** 角色关系动态备注 */
  relationship_notes: string[];
  /** 给故事写手的风格/节奏指引 */
  tone_guidance: string;
}

interface StoryBeat {
  /** 预计发生的回合范围 */
  target_round_range: string;
  /** 事件简述 */
  description: string;
  /** 涉及的关键角色 */
  key_characters: string[];
  /** 优先级 */
  priority: 'critical' | 'important' | 'optional';
}

interface Foreshadow {
  /** 伏笔 ID */
  id: string;
  /** 伏笔描述 */
  description: string;
  /** 当前状态 */
  status: 'planted' | 'developing' | 'approaching' | 'resolved';
  /** 埋设回合 */
  planted_round: number;
  /** 预计揭示回合 */
  expected_reveal_round?: number;
}
```

#### 触发规则

- **定时触发**：每 10 回合自动调用（回合计数器追踪）
- **强制触发**：故事写手在回合剧本中设置 `force_replan: true` 时，下一回合开始前先执行规划大师
- 强制触发后，回合计数器归零，重新开始 10 回合倒计时

### 7.5 三模型 Galgame 模式职责边界

| 维度 | 故事写手 (LLM1) | 逻辑模型 (LLM2) | 剧情规划大师 (LLM1) |
|---|---|---|---|
| **调用频率** | 每回合 1 次 | 自由活动按需 + 每回合结束 1 次 | 每 10 回合 / 强制触发 |
| **输入** | 大纲 + 游戏状态 + 过往总结 | 玩家输入 + 角色设定 / 本回合行为记录 | 游戏状态 + 全部过往总结 + 旧大纲 |
| **输出格式** | RoundScript JSON | 自定义对话文本 / 数值变更 + 故事总结 | PlotOutline JSON |
| **Prompt 模板** | Galgame 故事写手专用 | Galgame 逻辑模型专用 | 剧情规划大师专用 |
| **是否流式** | ❌ 否（一次性 JSON） | 自定义对话 ✅ / 总结 ❌ | ❌ 否 |

> **提示词模板**：三套 Prompt 模板均为 Galgame 模式专属，与沙盒模式的 Prompt 完全隔离。通过 `settingsStore.playMode` 判断加载哪一套。

---

## 8. 美术资源与调度架构

### 8.1 立绘差分系统

#### 5.1.1 资源规格

每个可交互角色配备 **13 张精细差分立绘**，涵盖以下基础表情/动作集：

| 编号 | 差分名称 | 标签标识符 | 触发场景举例 |
|---|---|---|---|
| 01 | 默认/平静 | `neutral` | 日常对话 |
| 02 | 微笑/开心 | `happy` | 好感度上升、收到礼物 |
| 03 | 大笑/爆笑 | `laugh` | 搞笑事件 |
| 04 | 害羞/脸红 | `shy` | 亲密互动、告白 |
| 05 | 愤怒/生气 | `angry` | 冲突、触怒 |
| 06 | 悲伤/哭泣 | `sad` | 离别、失败 |
| 07 | 惊讶/震惊 | `surprised` | 意外事件 |
| 08 | 傲娇/别扭 | `tsundere` | 口是心非场景 |
| 09 | 思考/困惑 | `thinking` | 谜题、深度对话 |
| 10 | 战斗/决心 | `determined` | 战前、重大决定 |
| 11 | 受伤/疲惫 | `hurt` | 战败、体力不支 |
| 12 | 特殊A | `special_a` | 角色专属（如灵梦的"赐福"、魔理沙的"星辰魔炮"） |
| 13 | 特殊B | `special_b` | 角色专属变体 |

#### 5.1.2 资源文件约定

```
src/assets/images/sprites/
├── reimu/                  # 博丽灵梦
│   ├── neutral.png
│   ├── happy.png
│   ├── shy.png
│   ├── angry.png
│   └── ...（共 13 张）
├── marisa/                 # 雾雨魔理沙
│   ├── neutral.png
│   └── ...
└── [character_id]/
    └── [emotion].png
```

#### 5.1.3 动态调度流程

```
LLM 回复文本："灵梦红着脸别过头去...[emotion: shy]"
                                        ↓
               Tag Parser 中间件提取 → { character: 'reimu', emotion: 'shy' }
                                        ↓
               SpriteLayer 组件接收 → 执行 crossfade 动画
                                        ↓
               加载 /sprites/reimu/shy.png → 平滑淡入替换当前立绘
```

### 8.2 场景背景系统

#### 5.2.1 资源分类

```
src/assets/images/backgrounds/
├── locations/
│   ├── hakurei_shrine_day.jpg      # 博丽神社（白天）
│   ├── hakurei_shrine_night.jpg    # 博丽神社（夜晚）
│   ├── izakaya_interior.jpg        # 居酒屋内部
│   ├── bamboo_forest.jpg           # 迷途竹林
│   ├── scarlet_manor.jpg           # 红魔馆
│   └── ...
└── events/
    ├── battle_field.jpg             # 通用战场
    ├── festival.jpg                 # 节日/祭典
    └── ...
```

#### 5.2.2 场景切换触发

背景切换可由以下方式触发：

1. **大模型标签**：`[bg: hakurei_shrine_night]`
2. **GameState 地理位置变化**：监听 `gameStore.state.player.location` 的变化，自动匹配最接近的背景。
3. **时间系统联动**：根据 `gameStore.state.player.time` 自动切换同一地点的昼/夜版本。

### 8.3 BGM 情景联动系统

#### 5.3.1 资源分类

```
src/assets/audio/bgm/
├── daily/                  # 日常场景
│   ├── peaceful.mp3
│   └── cooking.mp3
├── romantic/               # 恋爱/温情场景
│   └── heartbeat.mp3
├── tension/                # 紧张/悬疑场景
│   └── mystery.mp3
├── battle/                 # 战斗（已有 RPG_battle 目录）
│   └── ...
└── event/                  # 特殊事件
    ├── festival.mp3
    └── boss_encounter.mp3
```

#### 5.3.2 切换逻辑

- 支持 **Crossfade（交叉淡入淡出）** 过渡，避免突兀的切歌。
- 由大模型标签 `[bgm: romantic]` 或场景自动匹配系统触发。
- 复用并扩展现有的 `services/audio.ts` 中的 `audioManager`。
- 如果当前 `MusicPlayer` 正在播放用户自选的曲目，则**尊重用户选择**，不做强制切换。

---

## 9. 全新独立 UI 体系设计

### 9.1 设计总纲："抛弃扁平化，转向立体悬浮"

- **告别**：当前的白色卡片 + 固定侧边栏 + 线性气泡流布局。
- **转向**：类似 Unity 引擎开发的 SLG/RPG 游戏的多层级悬浮式 HUD 排版。
- **核心 CSS 技法**：
  - `backdrop-filter: blur()` — 毛玻璃/磨砂底板
  - 多级 `box-shadow` — 大范围弥散冷色阴影营造景深悬浮感
  - `transform: perspective()` — 伪 3D 倾斜与弹起效果
  - 精细的 `transition` 和 `@keyframes` — 每一个交互都有实体般的反馈动效分量

### 9.2 立体化视觉增强规范

> **核心原则**：仅靠 `backdrop-filter: blur()` 和 `box-shadow` 无法真正跳出"精致的扁平化 Web"范畴。要达到文档所承诺的"对标 Unity 引擎质感"，必须在以下 5 个维度建立严格的视觉规范。

#### 9.2.1 统一光源系统 (Unified Light Direction)

所有 HUD 面板、按钮、卡片都应遵循**同一个虚拟光源方向**（默认：左上方 45 度），以此建立全局一致的"被照亮的实体"感知：

- **受光边缘**（上边缘 + 左边缘）：使用 1px 的亮色半透明 `border`（如 `rgba(255, 255, 255, 0.15)`），模拟光照打在面板上沿的高光反射。
- **背光边缘**（下边缘 + 右边缘）：使用 1px 的深色半透明 `border`（如 `rgba(0, 0, 0, 0.4)`），模拟面板底部的自投阴影。
- **面板整体**：在左上角添加一层极淡的径向渐变（`radial-gradient`），模拟光源照射的漫反射亮区。

```css
/* 伪代码示例：统一光源面板基类 */
.gal-panel {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.06) 0%,
    transparent 50%
  ), rgba(10, 10, 20, 0.82);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(0, 0, 0, 0.5);
  border-right: 1px solid rgba(0, 0, 0, 0.35);
}
```

**关键约束**：整个 Galgame UI 中不允许出现违反此光源方向的高光/阴影组合。任何新增面板组件都必须继承此光源基类或遵守相同规则。

#### 9.2.2 边缘厚度模拟 (Edge Thickness)

真正的 HUD 面板不是"一张纸"，而应该是"一块有厚度的板"。通过伪元素 (`::before` / `::after`) 模拟面板的 **2~4px 侧面厚度**：

- **底部厚度条**：使用 `::after` 在面板正下方叠加一个略深色的窄条（高度 2~3px），颜色比面板主体暗 15%~20%，模拟面板的"侧切面"。
- **右侧厚度条**：同理，对有明确边界的面板（如对话框、物品栏），在右侧添加一个极窄的竖向暗条。
- **圆角适配**：厚度条的圆角半径应比面板本体略大（+1px），确保视觉上的边缘包裹感。

```css
/* 伪代码示例：面板底部厚度 */
.gal-panel::after {
  content: '';
  position: absolute;
  bottom: -3px;
  left: 4px;
  right: 4px;
  height: 3px;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 0 0 calc(var(--panel-radius) + 1px) calc(var(--panel-radius) + 1px);
  filter: blur(1px);
}
```

#### 9.2.3 凹凸对比 (Inset vs. Raised — 局部 Neumorphism)

面板内部的可交互子元素（HP 槽、输入框、进度条、按钮凹槽）应该与面板外壳形成**明确的凹凸对比**：

| 元素类型 | 视觉处理 | CSS 关键属性 |
|---|---|---|
| 面板外壳 | **外凸** — 浮在背景之上 | `box-shadow: 0 8px 32px rgba(0,0,0,0.6)` |
| HP/MP 槽轨道 | **内凹** — 嵌入面板表面 | `box-shadow: inset 0 2px 6px rgba(0,0,0,0.7)` |
| 可点击按钮 | **微凸** — 略高于面板表面 | `box-shadow: 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)` |
| 按钮按下态 | **凹陷** — 按入面板 | `box-shadow: inset 0 2px 4px rgba(0,0,0,0.6); transform: translateY(1px)` |
| 文本输入框 | **凹槽** — 刻入面板 | `box-shadow: inset 0 1px 4px rgba(0,0,0,0.5); background: rgba(0,0,0,0.3)` |

这种"仪表盘上嵌着凹下去的仪表槽"的层次感，是区分"游戏 UI"和"网页 UI"的核心视觉差异。

#### 9.2.4 景深模糊分层 (Depth-of-Field Blur Gradient)

6 层 Z-Layer 不仅仅是 `z-index` 的数字差异，每一层的**清晰度/模糊度**也应有差异，以模拟真实摄影中的景深效果：

| 图层 | z-index | 景深处理 |
|---|---|---|
| Layer 1: 背景层 | 10 | 基础清晰，但叠加轻微高斯模糊（`blur(2~4px)`）+ 暗角 `vignette` 滤镜 |
| Layer 2: 立绘层 | 20 | 主说话者完全清晰；非活跃副角色添加 `blur(1~2px)` + 降低 `opacity` |
| Layer 3: 对话层 | 30 | 完全锐利清晰（玩家视觉焦点所在） |
| Layer 4: HUD 层 | 40 | 完全锐利清晰，但面板底板的 `backdrop-filter` 会自然模糊其下方内容 |
| Layer 5: 选项层 | 50 | 选项卡本身锐利；出现时，**Layer 1~2 额外叠加一层 `blur(6~8px)` 的聚焦遮罩**，迫使视觉焦点集中到选项上 |
| Layer 6: 模态层 | 60 | 模态弹窗锐利；**Layer 1~5 全部叠加深色半透明遮罩 + 模糊** |

**实现方式**：在 `GalgameEngine.vue` 根容器中，通过响应式状态（如 `currentFocusLayer`）动态给低层图层添加 CSS `filter: blur()` 类名。

#### 9.2.5 物理重量感动效 (Physically-Weighted Motion)

所有面板/组件的出现、消失、交互反馈动画，都应该表现出"这是一个有质量的实体在物理空间中运动"的感觉，而非 PPT 式的淡入淡出：

| 动效场景 | 反面教材（扁平感） | 正确做法（重量感） |
|---|---|---|
| 面板弹出 | `opacity: 0->1` 线性淡入 | `scale(0.85) translateY(20px)` -> `scale(1) translateY(0)` + **弹性缓动** |
| 面板关闭 | `opacity: 1->0` 线性淡出 | 先缩小到 `scale(0.95)` + 下沉 `translateY(8px)`，然后淡出——模拟"向远处掉落" |
| 按钮悬停 | `scale(1.05)` | `scale(1.04) translateY(-2px)` + 阴影范围同步扩大——模拟"被磁力轻轻抬起" |
| 按钮点击 | 无反馈 | `scale(0.97) translateY(1px)` + 阴影骤然收紧——模拟"被按入表面" |
| 选项卡选中 | 高亮变色 | 选中项 `scale(1.08)` 弹起 + 发光；其余 `scale(0.92) + blur(2px)` 后退模糊 |
| 侧栏滑出 | `translateX` 匀速 | ease-out + 到达终点时微微 **overshoot 回弹 2~3px**——模拟惯性抽屉 |

**CSS 缓动曲线推荐**：
```css
/* 弹性弹出（面板出现） */
--ease-spring-out: cubic-bezier(0.34, 1.56, 0.64, 1);
/* 阻尼收回（面板关闭） */
--ease-damp-in: cubic-bezier(0.55, 0.085, 0.68, 0.53);
/* 惯性滑动（侧栏/抽屉） */
--ease-inertia: cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

#### 9.2.6 Design Token 汇总（立体化专用）

以下 CSS 变量应作为 Galgame 模式的全局设计令牌，统一管控所有面板的立体质感：

```css
:root {
  /* -- 光源系统 -- */
  --light-direction: 135deg;                          /* 光源角度（左上 45 度 -> 渐变 135deg） */
  --highlight-edge: rgba(255, 255, 255, 0.12);       /* 受光边缘色 */
  --shadow-edge: rgba(0, 0, 0, 0.45);                /* 背光边缘色 */
  --surface-glare: rgba(255, 255, 255, 0.06);        /* 表面漫反射亮斑 */

  /* -- 面板底板 -- */
  --panel-bg: rgba(10, 10, 20, 0.82);                /* 面板主背景色 */
  --panel-radius: 12px;                               /* 面板圆角 */
  --panel-thickness: 3px;                             /* 边缘厚度模拟值 */

  /* -- 阴影层级（由近到远） -- */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.4);         /* 按钮/小元素 */
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.5);        /* 普通面板 */
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.6);        /* 大型浮窗 */
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.7);       /* 模态层 */
  --shadow-inset: inset 0 2px 6px rgba(0, 0, 0, 0.6); /* 凹陷元素 */

  /* -- 景深模糊 -- */
  --blur-bg: blur(3px);                               /* 背景层默认模糊 */
  --blur-inactive-sprite: blur(1.5px);                /* 非活跃立绘模糊 */
  --blur-focus-overlay: blur(7px);                    /* 选项/模态出现时的聚焦遮罩 */
  --backdrop-blur-panel: blur(12px);                   /* 面板底板毛玻璃 */

  /* -- 动效缓动 -- */
  --ease-spring-out: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-damp-in: cubic-bezier(0.55, 0.085, 0.68, 0.53);
  --ease-inertia: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
}
```

### 9.3 图层分拆架构 (Z-Layer Architecture)

新 UI 被严格分为 **6 个独立的 Z 轴图层**，各层独立管理渲染，互不干扰：

```
┌─────────────────────────────────────────────┐
│  Layer 6: 模态层 (Modals / Overlays)         │  z-index: 60
│  ├── 全屏战斗系统 (CombatOverlay)             │
│  ├── 设置 / 存档管理面板                       │
│  └── 确认对话框 / Toast                       │
├─────────────────────────────────────────────┤
│  Layer 5: 选项层 (Choice Layer)              │  z-index: 50
│  └── 剧情分歧选项卡（悬浮居中）               │
├─────────────────────────────────────────────┤
│  Layer 4: HUD 层 (Heads-Up Display)         │  z-index: 40
│  ├── 左上：玩家状态面板（头像框 + HP/MP 槽）    │
│  ├── 右上：任务指示器 / 日期时间               │
│  ├── 右侧：迷你地图 / 角色图标列表            │
│  └── 左下：快捷物品栏 / 符卡快捷键            │
├─────────────────────────────────────────────┤
│  Layer 3: 对话层 (Dialogue Layer)            │  z-index: 30
│  └── 底部黑色半透明 AVG 对话框                │
│      ├── 角色铭牌（发光边框）                   │
│      ├── 打字机文本渲染区                       │
│      └── 点击继续指示符 (▼)                    │
├─────────────────────────────────────────────┤
│  Layer 2: 立绘层 (Sprite Layer)              │  z-index: 20
│  ├── 主说话者立绘（居中偏右, ~1000px高）        │
│  ├── 在场副角色立绘（两侧, 略缩小&半透明）      │
│  └── 进出场/表情切换: CSS transition           │
├─────────────────────────────────────────────┤
│  Layer 1: 背景层 (Background Layer)          │  z-index: 10
│  ├── 全屏场景 CG                              │
│  ├── 天气/粒子特效叠加                         │
│  └── 暗角/氛围滤镜                             │
└─────────────────────────────────────────────┘
```

### 9.4 各核心面板详细设计

#### 6.3.1 玩家状态 HUD（左上角）

**外观**：一个横向的窄条状悬浮面板，半透明深色底板 + 金色/红色主题描边。
**内容**：
- 圆形头像框（带战斗等级徽章角标）
- HP 槽：渐变红色 → 流光效果，低 HP 时自动脉动警告
- MP 槽：渐变蓝色
- 金钱数值：带币图标
- 战斗力显示

**交互**：鼠标悬停 → 面板向下展开，露出详细的属性面板（力量、声望等）。

#### 6.3.2 角色好感度/状态侧栏（右侧可展开）

**外观**：平时只显示为一列小型角色头像圆点（按好感度排序）。
**交互**：
- 悬停单个头像 → 浮窗显示该角色名、当前心情、好感度值。
- 点击展开 → 滑出完整的角色关系面板（好感度进度条、关系标签、内心独白预览等）。
- 直接映射现有 `NPCStatus` 的所有字段。

#### 6.3.3 任务指示器（右上角）

**外观**：始终悬浮显示当前活跃主线任务名称（单行），带发光脉冲效果暗示"有活跃目标"。
**交互**：点击展开完整任务日志面板。
**数据源**：直接消费 `gameStore.state.system.quests.filter(q => q.status === 'active')`。

#### 6.3.4 AVG 对话框（底部）

**外观**：
- 宽度占屏幕 85%~90%，高度约 180~220px。
- 背景：`rgba(0, 0, 0, 0.75)` + `backdrop-blur(12px)` + 顶部渐隐（从全透明到半透明的平滑过渡，避免硬边）。
- 左上角：角色铭牌（名字 + 发光描边盒）。
- 正文区域：大号衬线字体（`font-serif-display`），支持逐字/逐行打字机动画。
- 右下角：等待点击的脉动三角形 `▼`。

**交互**：
- 点击任意区域 / 按空格 / 按回车 → 立刻完成打字或推进到下一段。
- 滚轮向上 → 回看历史对话记录（覆盖式弹出半透明日志面板）。

#### 6.3.5 剧情选项卡（屏幕中央悬浮）

**触发时机**：当 LLM 返回的标签中包含 `[OPTIONS: ...]` 时渲染。
**外观**：
- 3~4 个纵向排列的长条矩形按钮。
- 每个按钮具有**磨砂深色底板 + 渐变发光描边 + 微妙的呼吸脉动**。
- 鼠标悬停时：按钮放大 1.05 倍，描边加亮，背景补光。
- 最后一个选项固定为"✏️ 自由行动..."，点击后在原地展开一个内联输入框。

**选项反馈**：
- 点击后，选中项短暂高亮并放大，其余选项快速淡出消失。
- 延迟 300ms 后，将选中的文本作为"用户输入"注入 GameLoop 进行下一轮推理。

#### 6.3.6 物品栏/背包（可呼出面板）

**触发**：快捷键 `I` 或 HUD 上的背包图标按钮。
**外观**：从屏幕底部或右侧滑入的大型悬浮面板。网格化的物品图标 + 数量角标。悬停显示描述浮窗。
**数据源**：`gameStore.state.player.items[]` + `gameStore.state.player.spell_cards[]`。

---

## 10. 现有系统复用与解耦策略

### 10.1 核心原则："后端静织，前端换壳"

> **最最关键的一点**：我们辛苦构建的所有底层系统（数据管理、存档回滚、战斗引擎、游戏循环）**全部保持不变**。新模式本质上只是一个全新的"视图消费器"。

### 10.2 完全复用（零修改）的模块

| 模块 | 文件 | 说明 |
|---|---|---|
| 游戏状态管理 | `stores/game.ts` | `GameState` 数据结构原封不动 |
| 存档系统 | `stores/save.ts` | 存档/读档/切换全部兼容 |
| 聊天持久化 | `stores/chat.ts` | 对话历史、快照回滚一切照旧 |
| 角色数据 | `stores/character.ts` | NPC 数据直接消费 |
| 数据库服务 | `services/DatabaseService.ts` | SQLite 层无需任何改动 |
| 游戏循环引擎 | `services/gameLoop.ts` | 核心推理/判定逻辑不变 |
| LLM 调用层 | `services/llm.ts` | API 调用管线不变 |
| 逻辑处理器 | `services/logic.ts` | 状态更新/指令执行不变 |
| 战斗底层算法 | `services/combatLogic.ts` | 伤害/治疗/Buff 计算不变 |
| 战斗覆盖层 | `components/CombatOverlay.vue` | 战斗UI 可直接在新模式中叠加 |
| 记忆系统 | `services/memory.ts` | 记忆存取/回滚不变 |
| 音频管理 | `services/audio.ts` | 音效播放基础设施不变 |
| 类型定义 | `types/*.ts` | 所有 Interface 零修改 |

### 10.3 需要增强/扩展的模块

| 模块 | 改动内容 |
|---|---|
| `services/prompt.ts` / `stores/prompt.ts` | 追加"剧情规划大师"指令注入层 + 标签输出要求 |
| `services/audio.ts` | 增加 Crossfade BGM 切换能力 |
| `stores/settings.ts` | 新增"游玩模式 (sandbox/galgame)"设置项 |
| `components/NewGameWizard.vue` | 新增模式选择步骤 |
| `App.vue` | 新增模式判断的顶层路由分流：渲染聊天 UI 还是 GalgameEngine |

### 10.4 全新开发的模块

| 组件/服务 | 职责 |
|---|---|
| `components/galgame/GalgameEngine.vue` | Galgame 模式的根容器组件 |
| `components/galgame/BackgroundLayer.vue` | 全屏背景 CG 渲染 + 天气粒子 |
| `components/galgame/SpriteLayer.vue` | 角色立绘差分渲染 + 切换动画 |
| `components/galgame/DialogueBox.vue` | AVG 文本框 + 打字机特效 |
| `components/galgame/ChoicePanel.vue` | 悬浮剧情选项卡 |
| `components/galgame/HudPlayerStatus.vue` | 左上角玩家状态 HUD |
| `components/galgame/HudQuestTracker.vue` | 右上角任务追踪 HUD |
| `components/galgame/HudCharacterBar.vue` | 右侧角色速览侧栏 |
| `components/galgame/InventoryPanel.vue` | 悬浮式物品栏面板 |
| `components/galgame/HistoryLog.vue` | 对话回顾日志面板 |
| **RE6 式 3D 预设选择** | |
| `components/galgame/PresetSelector3D.vue` | RE6 式 Three.js 3D 预设选择场景的 Vue 包装器 |
| `services/three/presetScene.ts` | Three.js 场景初始化、相机控制、命运线渲染、后处理管线 |
| `data/storyPresets.ts` | 开局预设数据定义（路线名称/描述/角色/覆盖状态等） |
| **新玩家引导 (v2)** | |
| `components/galgame/OnboardingFlow.vue` | 看板娘引导对话的根组件（复用 DialogueBox + SpriteLayer）|
| **解析与调度服务** | |
| `services/tagParser.ts` | LLM 输出 → 结构化标签 提取中间件 |
| `services/spriteResolver.ts` | 角色ID + 表情标签 → 实际图片路径 解析器 |
| `services/plotDirector.ts` | 剧情规划大师逻辑核心 |

---

## 11. 技术实施路线图

### Phase 0: 美术资源筹备期（📍 当前阶段）

> **⏳ 正在进行中 — 等待美术完成**

- [ ] 完成所有核心角色的 13 张差分立绘绘制（优先级最高）
- [ ] 整理/制作各场景的背景 CG 图片
- [ ] 挑选/制作各情境下的 BGM 配乐
- [ ] 确定最终的角色列表与差分标识符命名规范

> 在此期间，代码侧**不动工**。所有精力集中在美术产出上。

### Phase 1: 基础设施 + 占位骨架（~3 天）

- [ ] `npm install three @types/three` 引入 Three.js 依赖
- [ ] 创建 `components/galgame/` 目录及所有子组件的空壳文件
- [ ] 在 `App.vue` 中增加模式判断逻辑
- [ ] 用纯色几何占位图（灰块）和 Lorem Ipsum 拉通六层图层的 Z-index 布局
- [ ] 验证层叠渲染的正确性与不同分辨率下的自适应能力
- [ ] 完成 `GalgameEngine.vue` 根容器的基础生命周期绑定（接入 GameStore 和 ChatStore）

### Phase 2: RE6 式 3D 预设选择界面（~4 天）

- [ ] 开发 `services/three/presetScene.ts`：Three.js 场景初始化、`PerspectiveCamera`、`fog`
- [ ] 实现命运之丝（发光线条）系统：`Line2` + 流光 ShaderMaterial
- [ ] 实现角色锚点：`Sprite`/`Plane` + `Raycaster` 悬停检测
- [ ] 实现镜头运镜动画：`lerp` 平滑推进 + 选中后的 Rush-in 特效
- [ ] 集成后处理管线：`EffectComposer` + `UnrealBloomPass` + `GlitchPass`
- [ ] 开发 `PresetSelector3D.vue`：Vue 包装器 + 叠加 DOM 路线简介浮窗
- [ ] 编写 `data/storyPresets.ts`：定义初始的 2~3 条预设路线数据
- [ ] 与 `saveStore.createSave()` 完成存档创建对接

### Phase 3: 标签解析与调度系统（~3 天）

- [ ] 开发 `services/tagParser.ts`：正则提取 `[emotion: xxx]`, `[bgm: xxx]`, `[bg: xxx]`, `[OPTIONS: ...]` 等
- [ ] 开发 `services/spriteResolver.ts`：角色映射 + 文件存在性校验 + 回退逻辑
- [ ] 修改 Prompt 层追加标签输出要求
- [ ] 联调验证 LLM → 解析 → 渲染 的完整链路

### Phase 4: 核心 Galgame UI 精雕（~5 天）

- [ ] 实现 `DialogueBox.vue` 打字机特效 + 角色铭牌
- [ ] 实现 `SpriteLayer.vue` 带 Crossfade 的立绘切换
- [ ] 实现 `BackgroundLayer.vue` 带过渡的场景切换
- [ ] 实现 `ChoicePanel.vue` 发光悬浮选项卡
- [ ] 实现所有 HUD 面板的立体悬浮 CSS 质感
- [ ] 音频系统 Crossfade BGM 支持

### Phase 5: 剧情规划引擎（~3 天）

- [ ] 开发 `services/plotDirector.ts` 核心逻辑
- [ ] 实现 Era 式事件/日程选择面板
- [ ] 对接选项卡点击 → GameLoop 推理的完整闭环
- [ ] 测试多轮剧情连贯性与伏笔系统

### Phase 6: 沙盒模式 UI 统一升级（~3 天）

- [ ] 提取共享 Design Token（CSS 变量：阴影级别、模糊值、主题色等）
- [ ] 逐组件升级沙盒模式的视觉样式（Header → 气泡 → 侧栏 → 状态卡 → 输入框）
- [ ] 确保两种模式的切换过渡自然，视觉语言一致
- [ ] 暗色/明色主题双模式支持

### Phase 7: 资产填装与抛光（~3 天）

- [ ] 将真实立绘、背景 CG、BGM 替换占位资源
- [ ] 全面的跨分辨率 / 移动端适配测试
- [ ] 微交互打磨：hover 发光、点击缩放、页面切换过场
- [ ] 性能优化：大图懒加载、Three.js 纹理回收、BGM 预缓存策略

### Phase 8: 新玩家引导重构（最后实施，~3 天）

- [ ] 开发 `OnboardingFlow.vue`：复用 `DialogueBox` + `SpriteLayer`
- [ ] 编写看板娘引导对话脚本（取名/选模式/API 配置包装）
- [ ] 实现引导结束后到 RE6 预设选择 / 沙盒聊天的无缝过渡
- [ ] 替换旧的 `NewPlayerGuide.vue` + `isGuideActive` 逻辑

---

## 12. 资源清单与当前进度

### 12.1 美术资源进度追踪

| 资源类型 | 总需数量（估计） | 已完成 | 进度 |
|---|---|---|---|
| 角色立绘差分（每角色×13） | 待定 | 制作中 | 🔴 进行中 |
| 场景背景 CG | 待定 | 待整理 | 🔴 未开始 |
| 情景 BGM | 待定 | 待挑选 | 🔴 未开始 |
| 战斗背景（已有） | 若干 | ✅ | 🟢 已有 |
| 战斗 BGM（已有） | 若干 | ✅ | 🟢 已有 |
| 角色头像（已有） | 若干 | ✅ | 🟢 已有 |

### 12.2 现有可直接复用的资源目录

```
src/assets/images/battle_bg/      ← 战斗背景可直接复用
src/assets/images/battle_sprites/  ← 战斗立绘可参考
src/assets/images/head/            ← 头像图标可用于 HUD
src/assets/images/map/             ← 地图素材可用于小地图
src/assets/audio/bgm/RPG_battle/   ← 战斗 BGM 已完备
```

---

## 13. 附录：现有代码架构参考

### 13.1 核心数据流概览

```
用户输入/选项点击
       ↓
  App.vue (handleSend / handleQuickReply)
       ↓
  services/gameLoop.ts (processUserInput → callLLM → parseResponse)
       ↓  ┌──────────────────────┐
       ├──→ services/logic.ts    │ ← 状态更新（HP/物品/NPC 等）
       ├──→ services/memory.ts   │ ← 记忆存取
       └──→ stores/chat.ts       │ ← 对话持久化 + 快照
            └──────────────────────┘
       ↓
  前端渲染层（当前: ChatBubble / StatusCard 等）
       ↓
  [新增] GalgameEngine 分支渲染
       ├── SpriteLayer  (根据 emotion tag 切立绘)
       ├── DialogueBox   (渲染文本)
       ├── ChoicePanel   (渲染选项)
       └── HUD 面板们    (消费 GameState)
```

### 13.2 关键类型结构速查

- **`GameState`** (`types/game.ts`): 整个游戏世界的完整快照，包含 `player`、`npcs`、`system`、`flags`。
- **`PlayerStatus`** (`types/game.ts`): 玩家的一切属性：HP/MP/金钱/物品/符卡/位置/时间等。
- **`NPCStatus`** (`types/game.ts`): NPC 属性：好感度 (`favorability`)、服从度 (`obedience`)、关系、心情、动作、内心独白等。
- **`CombatState`** (`types/combat.ts`): 战斗状态机，控制参战人员、是否激活、回合数等。
- **`Quest`** (`types/game.ts`): 任务数据结构，包含 ID、描述、奖励、状态、日志。

### 13.3 开发约定备忘

- 所有代码注释**必须使用中文**。
- 日志打印**优先使用中文**。
- 新组件遵循现有命名规范：`PascalCase.vue`。
- 子目录采用**纯小写单词**命名，与现有 `combat/`、`management/` 风格保持一致。
- **Galgame 模式的所有组件统一放在 `src/components/galgame/` 目录下**，Three.js 相关服务放在 `src/services/three/`。
- CSS 框架为 TailwindCSS v4，配合项目已有的自定义 token（`izakaya-wood`、`touhou-red` 等）。
