# Phase 4 · 垂直切片成片试拍 QA 验收单 (`05_PILOT_SLICE_QA_CHECKLIST.md`)

> 硬红线：本表 **所有检查项全部标 `[x]` 通过，且用户审看 `pilot_slice.mp4` 明确批复继续后**，才允许解锁 Phase 5 全片生产！

- **切片覆盖时间段**：`__s – __s`（时长 `5–10s`，涵盖关键状态变化与转场桥梁）
- **交付成片路径**：`films/<slug>/out/pilot_slice.mp4`
- **关键帧联系表**：`films/<slug>/out/pilot_contact_sheet.jpg`
- **0.2s 动作连续条带**：`films/<slug>/out/transition_strip.jpg`
- **全资产核对样表**：`films/<slug>/out/asset_proof_sheet.jpg`

---

## 一、美术同源与视觉审片检查（AI 通过 `read_file` 亲眼核查）
- [ ] `asset_proof_sheet.jpg`：全部人物、载具、建筑出自同一画风底座，**0 处简陋代码几何拼凑体**；
- [ ] 若使用 `chroma_extract.py`：查看 `debug_sheet.png`，确认切片完整、无绿边（Green Spill）、无部件断裂；
- [ ] `transition_strip.jpg`（0.2s 步长连环图）：确认文字切换无重影叠字、运镜转折无顿挫跳帧、无黑边闪烁。

## 二、自动化技术硬扫描实测记录
- [ ] **`readcheck.mjs`** 扫描结果：`Exit Code = 0` · 通过条目数 `__ / __` · 无截断与驻留不足；
- [ ] **东亚/中国地图放大核查（如涉图）**：核查框图合规 `是 / 不适用`；
- [ ] **`mux.py` 响度与黑帧校验**：
  - 实测 Integrated Loudness：`____ LUFS`（要求 `-14.0 ± 1.0 LUFS`）；
  - 实测 True Peak：`____ dBTP`（要求 `<= -1.0 dBTP`）；
  - FFmpeg `blackdetect`：检测到异常全黑帧 `0` 帧。

## 三、用户试片最终批复
- [ ] 用户已查看切片成片、连环动作条与素材表，并明确回复：**“同意按当前水准展开全量制作”**。
- 用户补充微调意见：……
