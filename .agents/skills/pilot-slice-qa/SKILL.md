---
name: pilot-slice-qa
description: >-
  Executes the mandatory Phase 4 Pilot Slice quality gate: audits AI/vector assets
  on a unified proof sheet, renders a real 5-to-10 second vertical video slice with
  audio, transitions, HUD state animations, and subtitles, runs automated readcheck
  and FFmpeg loudness/blackdetect QA, and enforces visual frame-strip review before
  unlocking full production. Use before full rendering or during Phase 4 of any project.
---

# Pilot Slice QA · 垂直切片试拍与全自动门禁检验

**核心理念：** 绝不再犯“只看了几张静态抽帧就以为稳了，跑出正片才发现动效僵硬、转场跳切、字闪过去看不清”的错误。必须先用 **5～10 秒真实成片切片（`pilot_slice.mp4`）** 把技术管线、审美质感、音画踩点和转场全部打通验收！

---

## 门禁四步核查清单

### 1. 美术资产样表验收（Asset Proof Gate）
在把素材放进 `index.html` 合成前，先核验所有生成的底图与精灵：
- 若通过 `core/render/chroma_extract.py` 切过绿幕，运行后必须用 `read_file` 查看 `debug_sheet.png`，核查：
  - 是否存在绿边残留（Edge Spill）？
  - 是否有零件被拆散成多块（`--min-area` 调大或修复边缘断裂）？
- 将本切片用到的所有 `assets/` 图片拼成一张 `asset_proof_sheet.jpg` 用 `read_file` 审查：
  - **一票否决（铁律 3）**：画面中是否存在与精美插画风格格格不入的“代码简陋方块/椭圆几何替代品”？若有，**立刻停下重做资产**。

---

### 2. 自动化无情硬扫描（Zero-Tolerance Checks）
按顺序跑通下列脚本，任意一项失败必须先修干净：

1. **文字驻留与防截断扫描 (`readcheck.mjs`)**：
   ```powershell
   node core\render\readcheck.mjs "films\<slug>" --step 0.05
   ```
   - 所有标牌/注释必须完整留在 1920×1080 画框内（`inside box`）且时长满足可读最低秒数。
   - **严禁滥用 `pass: true` 掩盖正文字幕！**

2. **关键帧拼板 & 0.2s 动作连环条带 (`still.mjs` + `sheet.py`)**：
   - 全切片每 `1.0s` 抽帧拼出 `pilot_contact_sheet.jpg`；
   - **重点盯防转场/状态切换点**：在关键状态变化（如卡片变字、画面衔接擦除）前后 `2.0s` 内按 **`0.2s` 步长抽帧**拼成 `transition_strip.jpg`，排查以下 Apple 动效红线：
     - 卡片换字瞬间有没有出现旧字新字双影重影（Ghosting）？
     - 镜头经过曲线路标点时有没有猛地一顿或突兀变向？
     - 转场有没有出现黑边裂缝或突然跳切？

3. **音频响度与黑帧扫描 (`mux.py`)**：
   ```powershell
   C:\Users\L\anaconda3\python.exe core\render\mux.py "films\<slug>\out\pilot_video.mp4" "films\<slug>\out\pilot_mix.wav" "films\<slug>\out\pilot_slice.mp4"
   ```
   - 核对输出日志：Integrated Loudness 目标 **`-14.0 LUFS`（±1.0）**，True Peak **`<= -1.0 dBTP`**，`blackdetect` **0 个异常黑帧**。

---

### 3. 人工视觉复核 + 统一返修一轮
- **必须使用 `read_file` 亲自查看 `pilot_contact_sheet.jpg` 和 `transition_strip.jpg`**（如果切片含中国版图或边界，必须额外用 `still.mjs` 截一张放大帧确认台湾岛/海南岛/南海断续线合规）。
- 把发现的全部画面、文字、节奏问题**整理在同一轮集中修复完**，再重跑第 2 步验证至全绿通过。

---

### 4. 填表停审（Hard Stop Before Phase 5）
- 填写完成 `films/<slug>/05_PILOT_SLICE_QA_CHECKLIST.md`。
- 向用户递交：`pilot_slice.mp4`、`pilot_contact_sheet.jpg`、`transition_strip.jpg` 与实测 QA 参数表。
- **严格停在这里等待用户观看切片成片后明确回复“继续 / 批准全量制作”，再解锁 Phase 5！**
