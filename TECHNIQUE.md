# Chronicle Studio · 工程规范与确定性渲染管线 (TECHNIQUE)

本文件规定项目从时间轴数据、状态动效、AI 生图与精灵切片，到无头浏览器渲染、混音合成与自动化质检的工程实现标准。

---

## 1. 架构总览

```text
timeline.json (单一时间轴真相：章节 / BPM / 节拍 / 镜头 / 字幕 / 事件)
   ├──► index.html + core/lib/motion.js (确定性 render(t) 渲染函数)
   │        ├──► still.mjs + sheet.py      ──► 静帧抽查与 0.2s 动作连续条带
   │        ├──► readcheck.mjs               ──► 文字驻留时间与防出界自动化检查
   │        └──► video.mjs (Chrome CDP 管线) ──► out/video.mp4 (纯净画轨)
   ├──► AI 生成插画 / chroma_extract.py       ──► assets/plates/*.png & sprites/*.png
   ├──► 音轨合成 / 配乐 / 音效 / TTS          ──► out/mix.wav
   └──► srt.py + mux.py (FFmpeg 9+)          ──► <slug>.mp4 (-14 LUFS + 零黑帧) + .srt
```

---

## 2. 确定性页面契约 (`index.html`)

每一部影片（或分幕试拍项目）的主页 `index.html` 必须向引擎暴露以下 5 个标准接口：

```js
window.DUR = 45.0;                       // 总时长（秒），正实数
window.READY = true;                     // 当字体、高清底图与所有精灵加载完毕后置为 true
window.render = (t) => { ... };          // 绝对纯函数：任意传入 t 秒，确定性画出该刻完整画面
window.EV = [{ t: 1.5, type: 'stamp' }]; // 音效触发事件列表，供音频工程精确对齐 0ms
window.TEXTS = (t) => [                  // 返回 t 时刻可见文字包围盒，供 readcheck.mjs 检验
  { id: 'callout_sarajevo', text: '萨拉热窝 · 1914', x0: 820, y0: 410, x1: 1120, y1: 455, pass: false }
];
```

**工程红线：**
1. **绝对确定性（Stateless per frame）**：严禁使用 `Date.now()`、`performance.now()` 或原生 `Math.random()`。一切粒子、笔刷噪点与随机抖动必须通过 `core/lib/prng.js` 提供的 `mulberry32(seed)` / `hashStr(key)` 生成，保证逐帧回跳与多线程渲染完全一致。
2. **禁止累计上一帧状态**：`render(t)` 只根据当前 `t` 和 `timeline.json` 直接求值（例如使用解析式弹簧 `criticallyDampedSpring(t - t0, tau)` 或 C2 样条曲线），绝不依赖上一帧累加的 `vx += ax * dt`。
3. **单一世界坐标→屏幕坐标投影**：所有标注引线（Callout）、光斑或聚光灯必须由同一个数学投影函数算出，禁止手填像素硬编码。

---

## 3. 状态变化驱动的 Apple 级动效 (`core/lib/motion.js`)

动效的核心是**解释“从哪来、到哪去、和谁有关”**，禁止突兀跳变：
- **节奏锚定体系**：若片子按 BPM 走（如 80 BPM → 1 拍 = `0.75s`），时间阶梯与音乐严格咬合；通用标准时长表：`T_MICRO = 0.18s`（微反馈/印章轻压）、`T_UI = 0.36s`（卡片/引线展开）、`T_MORPH = 0.52s`（状态面板变形过渡）、`T_TRANS = 0.75s`（一拍整转场）、`T_GLIDE = 1.50s`（双拍跨区移镜）。
- **曲线语言统一**：出现与定格用 `easeOutQuint` / `easeOutExpo` 或无过冲临界阻尼弹簧 `criticallyDampedSpring(t, tau)`（$\zeta = 1.0$）；双点迁移用 `easeInOutCubic`；多镜位全局漫游必须经过 5 次 Hermite 样条 `QuinticHermiteSpline`，保证位置、速度、加速度（P/V/A）三阶连续。
- **禁令清单**：
  1. **严禁 `scale(0.001) -> scale(1.0)` 廉价缩放弹出**（改为：微小位移 + 透明度 + 柔和裁剪遮罩或毛细晕染展开）；
  2. **严禁文本变字交叉重叠重影（Ghosting）**：卡片换字时使用 `textCrossfadeWeights(u)`（前 42% 区间旧字退净、后 48% 区间新字亮起，同一像素永不双字叠透）；
  3. **必须提供 `?reducedMotion=1` 无障碍开关**：通过 `isReducedMotion()` 检测，开启后把大位移缩放收敛为温和淡入淡出。

---

## 4. `✦` 风格 AI 插画与绿幕精灵切片规范

当选用的风格含 `✦` 标记（插画、绘本、版画、剪纸、水墨）时：
1. **方式 A · 分层整图画幅（2.5D Pan/Parallax Plate）**：直接按 `1920×1080`（或带冗余移动余量的宽幅如 `2688×1512`）生成高精绘本场景图。如需景深视差，将前景元素通过绿幕或明确层次分离绘制，并在画面四周保留干净的排版呼吸区。
2. **方式 B · `#00FF00` 绿幕多动作精灵表 + `chroma_extract.py`**：
   - 生图提示词强制写死：`flat solid #00FF00 chroma green background, no gradient, no floor shadow on green, spaced grid layout with generous gap between parts, thick dark dip-pen ink outer contour`。
   - 运行切片命令：
     ```powershell
     C:\Users\L\anaconda3\python.exe core\render\chroma_extract.py "<sheet.png>" "<out_dir>" --min-area 500
     ```
   - 切完后**必须使用 `read_file` 亲自查看生成的 `<out_dir>\debug_sheet.png`**，确认无绿边残留（Edge Spill）、无部件误切割或粘连。

---

## 5. 音频、字幕与母带压限 (`srt.py` & `mux.py`)

- **字幕文件命名规则**：若字幕已在画面里作为美术排版的一部分渲染（烧录字幕），导出的外挂备份文件请命名为 `subtitles_<lang>.srt`；如画面干净无字幕，则命名为 `<slug>.srt`，避免播放器同时挂载双层字幕。
- **响度标准**：通过 `core/render/mux.py` 自动执行 FFmpeg **两遍响度标准化（Two-Pass EBU R128 `loudnorm`）**：目标响度 **`-14 LUFS`**、真峰值上限 **`-1.2 dBTP`**；混音前确保人声比配乐稳态 RMS 高出约 `8–10 dB` 并开启闪避。
- **出片后自动硬检测**：`mux.py` 在合片末尾会自动执行 `blackdetect` 全片扫描，只要发现异常全黑帧或音频时长缺失立即报非零退出码。

---

## 6. Windows PowerShell 5.1 执行注意事项

- **禁止使用 `&&`**：Windows 默认 PowerShell 5.1 不支持 bash 风格的 `&&` 链式符；在 `build.ps1` 或终端指令中必须使用 `$ErrorActionPreference = "Stop"` 并配合外部命令后的 `if ($LASTEXITCODE -ne 0) { throw "..." }`。
- **Chrome 无头驱动机制**：`core/render/cdp.mjs` 会按优先级查找环境变量 `CHRONICLE_CHROME`、Chrome 默认安装路径或 Edge；确保本机至少安装 Chrome 或 Edge 之一。
- **字体加载**：在 Windows 本地 Chrome 渲染中文时，可直接使用系统高质量中文字体族（如 `"SimSun"`, `"KaiTi"`, `"Microsoft YaHei"`）或将 OFL 开源字体（如 Noto Serif SC / 思源宋体 / 朱雀仿宋）静态存放在项目的 `fonts/` 目录通过 `@font-face` 加载，**切勿依赖运行时公网 CDN 请求**。
