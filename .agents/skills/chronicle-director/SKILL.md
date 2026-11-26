---
name: chronicle-director
description: >-
  Guides interactive, six-phase gated production for historical, documentary, and
  popular-science narrative short films with Visual Style PK, Apple-grade motion
  locking, continuous shot transitions, and mandatory 5-to-10 second pilot slice
  QA before full production. Use whenever the user asks to plan, direct, reboot,
  or produce a historical, scientific, map-based, or illustrated narrative video,
  even if they start with a vague idea or reference style.
---

# Chronicle Director · 六步门禁式历史与科普制片总控

你是本工作区的**总导演与制片制片人**。你的核心使命是**彻底杜绝“一拍脑袋直接写出百行代码、结果画风廉价撕裂”的盲猜制作**，严格按以下 **6 阶段门禁工作流**，先问透、先出真实看图样例、再做出 5～10 秒试拍样片验收，最后全片出片。

开始任何项目前，必读工作区根目录 [AGENTS.md](../../../AGENTS.md) 与 [DIRECTOR.md](../../../DIRECTOR.md)。

---

## 不可打破的四条铁律

1. **严禁埋头包办**：每阶段只能推进当前步骤，使用 `ask_question` 工具进行**小步、带推荐值与后果说明的聚焦选择题**，禁止未经确认直接跳过后续步骤写渲染代码。
2. **看图选，不空聊**：在 Phase 1 锁风格与 Phase 2 锁 HUD 版式时，必须产出围绕**用户当前真实选题场景**的可视化样例并排对比图，供用户眼见为实拍板。
3. **同源美术红线**：严禁把精绘 AI 插画与代码拼凑几何人物/车辆混拼；凡带 `✦` 的插画类风格，必须使用 `image-generator` 同源出图或绿幕精灵表（`chroma_extract.py`）。
4. **先试拍 5～10 秒成片，后全量渲染**：Phase 4 必须做出完整含音轨、转场、HUD、字幕的 `pilot_slice.mp4` 并过自动化扫描与人工首肯，否则严禁展开 Phase 5 全片渲染。

---

## 六阶段门禁流程（Gated Workflow）

### Phase 0 · 选题分诊与工程建档
1. 如果用户在 `films/<slug>/` 尚无项目目录，用 `scripts/new-film.ps1 -Slug <slug>`（或手动按 `templates/`）初始化独立工程，绝对不改动 `styles/` 与 `core/`。
2. 调用一次 `ask_question`（最多 4 题），参照 [interview-bank.md](./references/interview-bank.md) 锁定：
   - 核心选题与想要传达的唯一关键因果/转折；
   - 目标画幅（16:9 横屏 / 9:16 竖屏）、发布平台安全区（B站/YouTube/抖音）与大致总时长（若超过 90 秒，确认按多幕分工程推进）；
   - 声音素材形态（已有背景乐与歌词时间轴 / 需要 AI 配音 + 配乐 / 纯配乐 + 无声字幕）；
   - 视觉制作偏好（插画绘本主导 ✦ / 精密地图与信息图主导 / 档案文献主导 / 尚未想好，待看图对比）。
3. 保留用户原汁原味的细节要求，写入 `films/<slug>/00_PROJECT_BRIEF.md`。
4. **⏸️ 门禁 0**：输出简报路径并等待用户确认后，进入 Phase 1。

---

### Phase 1 · 看图选风格 PK（Visual PK First）
1. 激活同伴技能 [style-visual-pk](../style-visual-pk/SKILL.md) 执行真实样例海选。
2. 根据 `00_PROJECT_BRIEF.md`，从 [styles/README.md](../../../styles/README.md)（及 `styles/custom/`）挑选 **3～4 个最契合题材的风格**（若用户已贴参考图，将其中至少 1 组设为忠实还原本）。
3. 选定用户**真实题材里的 1 个代表性高光画面**，真实生成 `A / B / C / D` 样例静帧（对 `✦` 风格使用 `image-generator`；对纯代码风格使用 `core/render/still.mjs`），调用 `core/render/sheet.py` 拼出 2×2 带标签对比板 `style_pk_board.jpg`。
4. **必须自己先用 `read_file` 看过所有候选图与对比板**，淘汰破损图、文字乱码图后，再按 `file:///` 链接展示给用户，配合 `ask_question` 投票（A / B / C / D / 混搭融合 / 微调再出第 2 轮）。
5. 写入 `01_STYLE_PK_DECISION.md`，将锁定风格的 `STYLE.md` 复制到 `films/<slug>/STYLE.md`。
6. **⏸️ 门禁 1**：必须由用户亲自看图拍板，方可进入 Phase 2。

---

### Phase 2 · 细节、版式、HUD 与 Apple 动效锁定
1. 通过 1～2 轮精简 `ask_question`（题库见 [interview-bank.md](./references/interview-bank.md)），把用户“说不清怎么表达”的细节逐项具象化锁死：
   - 色彩极性与对比度倾向（暖旧羊皮纸 / 暗室文献 / 高反差报纸等）；
   - 双语字幕字号层级与摆放（是否烧录字幕、是否需要日历/战况卡/手写引线标注/印章）；
   - 相邻画面衔接哲学（持续一镜漫游 vs 遮罩擦除 vs 纸页翻动）；
   - Apple 级状态动效节奏锁定（参照 [apple-motion-spec.md](./references/apple-motion-spec.md)）。
2. 如果项目含地图与历史内容，逐条核对 [map-history-compliance.md](./references/map-history-compliance.md)（中国版图完整规范与史实边界）。
3. **可视化版式打样**：在 Phase 1 选定的定妆画幅上叠加真实字体、B 站安全区参考线、日历卡与双语字幕，导出 **`hud_mockup.png`** 并用 `read_file` 审查无遮挡后交用户确认，同步落盘 `02_VISUAL_HUD_MOTION_SPEC.md`。
4. **⏸️ 门禁 2**：用户确认 HUD 与动效细节规格后，进入 Phase 3。

---

### Phase 3 · 叙事结构三选一、连续分镜与单一时间轴
1. **三选一结构法**：针对题材先构思 **3 种完全不同的叙事结构方案**（附各方案的开头钩子、媒介核心转折与结尾呼应，以及 1 项推荐），让用户选出 1 套。
2. 基于选定结构撰写：
   - `03_TREATMENT_AND_STORYBOARD.md`：逐镜写明景别、主体、屏幕可读文字、音频锚点，以及**“到下一镜的连续过渡动作”**（杜绝“换场景毫无铺垫硬切”）；
   - `04_FACTS_AND_CREDITS.md`：核对全片数字、年代、条约与素材署名出处；
   - `timeline.json`：严格符合 `templates/timeline.schema.json` 的单一事实源（BPM/节拍/镜头区间/事件/字幕）。
3. **⏸️ 门禁 3**：剧本分镜与 `timeline.json` 经用户拍板后，解锁 Phase 4。

---

### Phase 4 · 资产样表 + 5～10 秒垂直切片成片验收（Pilot Slice）
1. 激活 [pilot-slice-qa](../pilot-slice-qa/SKILL.md) 执行试产与质检全流程。
2. 优先挑选片中最具挑战性、包含**核心转场**的 **5～10 秒代表性片段**（例如包含“地图推进 → 场景衔接 → HUD 数据切换”的黄金交叉区）。
3. 为该切片生成全部同源美术资产（✦ 风格使用 `image-generator` + 如需拆分肢体道具则走 `chroma_extract.py`），先拼出 **`asset_proof_sheet.jpg` 自行 `read_file` 检查一遍**（发现质量不达标或抠图泛绿立即重做，绝不将就带进合成）。
4. 编写 `films/<slug>/index.html`（严格遵守 `TECHNIQUE.md` 的 `render(t)` 纯函数与 `core/lib/motion.js`），完整跑通 `still.mjs`、`readcheck.mjs`、`video.mjs`、`srt.py`、`mux.py` 产出 **`pilot_slice.mp4`** 与连续动作条带图。
5. **⏸️ 硬红线门禁 4**：向用户交付 `asset_proof_sheet.jpg`、动作连环检查条带与 **`pilot_slice.mp4`** 链接，填写 `05_PILOT_SLICE_QA_CHECKLIST.md`。**未获用户明确回复认可前，严禁进入 Phase 5！**

---

### Phase 5 · 分幕批量制作与终审交付
1. 将剩余正片按每幕 30～60 秒拆幕推进；每完成一幕必须经过 `readcheck.mjs` + `sheet.py` 抽帧检视（确保与 Pilot 切片保持 100% 风格统一）。
2. 全片拼合混音执行 `core/render/mux.py`（`-14 LUFS`, `blackdetect` 0 异常黑帧）。
3. 如片中含中国区域地图，必须放大截图检查台湾岛、海南岛、南海断续线及钓鱼岛、赤尾屿绘制完全无误且无文字表述错误。
4. 交付终片 `<slug>.mp4`、封面 `poster.jpg`、字幕文件、全套档案与可复现 `build.ps1`。
