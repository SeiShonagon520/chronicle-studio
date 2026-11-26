# Chronicle Studio · 历史与科普叙事短片制片工作室

一套专为 **Google Antigravity** 设计的**“六步门禁式 + 视觉样例先行（Visual PK）”**历史与科普叙事视频制作框架与工具链。

它专门解决 AI 做视频最常见的三个翻车点：
1. **未对齐需求就盲写代码**：需求停留在“高级感、丝滑、不要太僵硬”等抽象词，做到一半发现画风、字体、HUD 完全不是想要的样子；
2. **美术撕裂与廉价拼贴**：同一画面里同时出现精细插画与简陋代码几何图形，导致强烈的违和感；
3. **只审静帧盲目全量渲染**：静态截图看起来还行，跑出成片后出现转场跳切、字闪过去看不清、音量爆表或音画错位。

---

## 核心方法论（四条铁律）

1. **铁律 1 · 严禁埋头包办**：通过多轮、聚焦的多选提问逐步锁死所有视觉、叙事与动效细节，拒绝一次甩 20 个填空题，也不替创作者私自脑补。
2. **铁律 2 · 看图选，不空聊（Visual PK First）**：用创作者的**真实选题场景**，同步生成 A / B / C / D 风格样例图并拼出对比板，用户直接看图拍板或混搭。
3. **铁律 3 · 同源美术红线**：纯地图/数据/蓝图可由代码生成；凡带有 `✦` 标记的插画/绘本/版画/剪纸风格，所有人物、建筑、载具与叙事画面**必须由图像生成器（`image-generator`）同源绘制**（或绿幕精灵表切片），**严禁使用简陋程序几何体拼凑人物或车辆**。
4. **铁律 4 · 六步门禁 + 垂直切片先行**：先做出 **5～10 秒带真实配乐、动效、转场与字幕的垂直切片成片（`pilot_slice.mp4`）**，通过自动化可读性检测、频谱响度校验与黑帧扫描并经用户点头，才解锁整片分幕生产。

---

## 六阶段门禁工作流

| 阶段 | 核心动作 | 标准产出文件 | 门禁要求 |
| :--- | :--- | :--- | :--- |
| **Phase 0 · 选题分诊** | 1 轮聚焦问答定题材、时长、画幅、音轨与管线倾向 | `00_PROJECT_BRIEF.md` | 需用户确认 |
| **Phase 1 · 看图选风格 PK** | 围绕当前题材做 A/B/C/D 真实风格样例 + 2×2 对比板 | `01_STYLE_PK_DECISION.md` + `style_pk_board.jpg` + `STYLE.md` | **看图选定后解锁** |
| **Phase 2 · 视觉/HUD/动效细化** | 锁定明暗极性、双语字体字号、安全边距、转场与 Apple 级状态动效 | `02_VISUAL_HUD_MOTION_SPEC.md` + `hud_mockup.png` | 需用户确认 |
| **Phase 3 · 叙事结构与连续分镜** | 先给 3 套备选叙事结构 → 确定后写出连续分镜、史实台账与时间轴 | `03_TREATMENT_AND_STORYBOARD.md` + `04_FACTS_AND_CREDITS.md` + `timeline.json` | 需用户确认 |
| **Phase 4 · 垂直切片试产** | 全套美术资产样表审核 + **5～10s `pilot_slice.mp4`** + 自动质检 | `asset_proof_sheet.jpg` + `05_PILOT_SLICE_QA_CHECKLIST.md` + `pilot_slice.mp4` | **硬红线：看片批准** |
| **Phase 5 · 分幕批量交付** | 按幕合成、自动响度标准化（`-14 LUFS`）、地图边界复核与交付打包 | `<slug>.mp4` + `poster.jpg` + `subtitles_*.srt` + `build.ps1` | 全检通过交付 |

---

## 内置风格索引（8 大历史与科普基准流派）

完整风格目录见 [styles/README.md](styles/README.md)：

- **✦ 绘本与手绘**：`french-pen-watercolor`（法式钢笔水彩绘本风）、`comic-history-cutout`（复古漫画剪纸地图风）、`copperplate-chronicle`（19 世纪铜版雕刻纪年风）、`ink-wash-scroll`（东方水墨长卷科普风）
- **档案与信息图**：`archival-lighttable`（暗房档案灯箱纪录片风）、`editorial-vox-atlas`（杂志级动态地图与信息图风）
- **地图与工程**：`relief-map-explainer`（3D 浮雕与流光战略地图风）、`blueprint-mechanism`（精密工程蓝图与器物拆解风）

---

## 目录结构

```text
chronicle-studio/
├── AGENTS.md                 # 工作区最高交互与制作铁律
├── DIRECTOR.md               # 导演手册（三选一结构、连续运镜、史实合规、交付标准）
├── TECHNIQUE.md              # 工程规范（render(t) 确定性契约、状态动效库、音画混音）
├── MY-STYLES.md              # 自定义/魔改风格全流程
├── .agents/skills/           # 3 大专用 Antigravity 技能包（director / visual-pk / pilot-qa）
├── styles/                   # 风格规范模板 + 8 大完整历史科普风格定义
├── templates/                # 00~05 标准门禁决策卡 + timeline.schema.json
├── prompts/                  # 开箱即用启动提示词（含新片/一战重启/改风格/生图蓝图）
├── core/
│   ├── lib/                  # 确定性 PRNG 与 Apple 状态动效数学库 (motion.js / prng.js)
│   ├── render/               # 零重依赖 Windows 友好渲染与质检管线 (CDP / FFmpeg / Python)
│   └── starter/              # 可直接跑通全链路的 4 秒参考模板工程
├── scripts/                  # 环境体检、新片脚手架、全局 Skill 同步工具
└── films/                    # 实际影视项目独立工作区（被 gitignore 隔离，保持库干净）
```

---

## 快速上手（Windows 原生零重依赖工具链）

本仓库渲染引擎直接基于 **Node 24 原生 WebSocket + Chrome DevTools Protocol (`cdp.mjs`)** 驱动本机 Chrome / Edge，无需额外下载数百 MB 浏览器依赖；配合 `FFmpeg` 与 Python（Pillow / numpy / scipy）即可本地出片与质检。

```powershell
# 1. 环境体检
.\scripts\check-env.ps1

# 2. 跑通 4 秒内置参考工程（含静帧、可读性校验、拼接图、成片、字幕、-14 LUFS 混音）
powershell -NoProfile -ExecutionPolicy Bypass -File .\core\starter\build.ps1

# 3. 为新选题创建独立工程目录
.\scripts\new-film.ps1 -Slug my-history-film

# 4. （可选）将 .agents/skills/ 同步到本机全局 ~/.gemini/config/skills/
.\scripts\sync-global-skills.ps1
```

在 Antigravity 中打开本仓库工作区后，直接复制粘贴 [prompts/00_START_NEW_FILM.md](prompts/00_START_NEW_FILM.md) 或 [prompts/01_REBOOT_WW1_PROJECT.md](prompts/01_REBOOT_WW1_PROJECT.md)，Agent 会自动按六步门禁流程与你逐项确认并先出样例。

---

## 致谢（Architectural Inspiration）

本框架在「`STYLE.md` 与故事彻底解耦的风格不变量」「确定性 `window.render(t)` 单一时间函数页面契约」「字幕/标注可读性自动扫描（`readcheck`）」以及「独立定制个人风格库（`MY-STYLES`）」等工程理念上，汲取了开源项目 [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) 的宝贵架构启发。本仓库内的全部文档、Skill 规范、提示词模板及 Windows 原生渲染工具链均为围绕历史与科普叙事长片工作流重新设计与原创编写。
