---
name: style-visual-pk
description: >-
  Executes the visual-first Style PK workflow ('看图选，不空聊'): renders 3 to 4
  distinct 1080p art-style candidates of a real key scene from the user's topic,
  stitches a side-by-side comparison board, inspects every sample first, and lets
  the user select or blend styles visually before writing production scene code.
  Use during Phase 1 of chronicle-director or whenever the user wants to compare
  visual styles concretely.
---

# Style Visual PK · “看图选，不空聊”风格盲盒打样技能

**核心理念：** 绝不用“你喜欢法式绘本还是赛博复古”这类纯文字让用户脑补盲选。针对用户当前真实选题的同一个关键画面，**同时做出 3～4 种画风的 1080p 真实样例 + 拼接对比板**，让用户指图说话！

---

## 标准化执行步骤（5 步闭环）

### Step 1：圈定 3～4 位候选选手（Candidates）
1. 结合 `00_PROJECT_BRIEF.md` 的题材基调与 [styles/README.md](../../../styles/README.md)，挑选最适配当前历史/科普题材的 **3～4 种差异化风格**（如：`A 风格偏绘本情绪、B 风格偏档案纪录、C 风格偏地图策略、D 风格偏版画肃穆`）。
2. 若用户在提问中已附带参考图（例如《勇敢的心》截图或某部纪录片片段），**必须将“忠实还原参考图质感”设为候选 A**，再提供 2～3 套有特色的演化/对比选项。
3. **阅读对应 `styles/<slug>/STYLE.md` 全部细节**（重点吃透第 1 节本质、第 2 节材质、第 3 节配色逻辑与第 10 节制作路线），禁止只看标题瞎猜。

### Step 2：选定统一“试金石核心画面（Anchor Scene）”
- 从用户**当前真实项目剧本**里挑 **1 个最具代表性的关键画面**（必须包含主体物、环境空间与叙事情绪，例如“1914 列日要塞外行军的德军与大贝莎巨炮”、或“丝绸之路驼队穿过敦煌沙丘”），**绝对禁止用抽象彩色方块或无意义茶壶测试图敷衍**。
- 所有 3～4 个候选方案必须呈现**几乎一致的叙事瞬间与主体内容**，确保观众一眼比对出的是**纯正画风差距**而非构图偏心。

### Step 3：严格同源制作样例（遵守铁律 3）
- 保存目录统一设为：`films/<slug>/style_pk/`，产出文件名依次为 `PK_A_<slug>.png`、`PK_B_<slug>.png`、`PK_C_<slug>.png`、`PK_D_<slug>.png`（统一 `1920×1080` 或项目目标宽高比）。
- **按风格所属制作管线分别实操**：
  - **若候选风格带 `✦`（绘本/漫画/版画/水墨插画）**：按 [prompt-recipes.md](./references/prompt-recipes.md) 编写完整提示词（含纸质基底、笔触特征、光影角度、负向防穿帮词），调用 `image-generator` **直接生成高质量成品风格参考图**。*禁止用代码画简陋色块假装绘本样式！*
  - **若候选风格为代码驱动（立体地图/蓝图/档案灯箱/杂志排版）**：编写干净清晰的 HTML/Canvas 原型直接通过 `core/render/still.mjs` 渲染真实效果（严禁在其中粗制滥造几何小人）。

### Step 4：AI 先审后拼板（Self-Inspection Before Showing）
1. **必须先调用 `read_file` 逐张审看 `PK_A..PK_D`**！检查是否存在严重畸形、英文乱码字块、廉价拼贴感或违反核心 `STYLE.md` 约束的失误。**有明显缺陷的样例必须在展示给用户之前重生成替换！**
2. 调用工作区工具拼成一目了然的 **2×2 风格PK对比总板**：
   ```powershell
   C:\Users\L\anaconda3\python.exe core\render\sheet.py "films/<slug>/style_pk/style_pk_board.jpg" `
     "films/<slug>/style_pk/PK_A.png" "films/<slug>/style_pk/PK_B.png" `
     "films/<slug>/style_pk/PK_C.png" "films/<slug>/style_pk/PK_D.png" `
     --cols 2 --tile-w 960 --titles "A: <名称>|B: <名称>|C: <名称>|D: <名称>" --header "Style Visual PK"
   ```
3. 用 `read_file` 检查 `style_pk_board.jpg` 确认排版工整清晰。

### Step 5：展示汇报与看图投票
1. 在回复中用简练客观对比（各自适用情绪、后期制作稳健度、声音匹配倾向）向用户呈递全部单张原图和总板 `file:///` 链接。
2. 紧接着用 `ask_question` 发起选择（选项：`定格 A` / `定格 B` / `定格 C` / `定格 D` / `混搭微调：保留某套的画风 + 另一套的排版/配色` / `都不满意，调整方向出第 2 轮`）。
3. 落盘决策至 `films/<slug>/01_STYLE_PK_DECISION.md`，记录用户具体反馈原话，准备进入 Phase 2 HUD 与细节微调。
