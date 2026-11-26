# ✦ 插画风格 AI 生图与绿幕精灵表提示词规范 (Prompt Recipes)

本规范专门保障所有带 `✦` 的插画、绘本、漫画、版画与水墨风格：**同一部片子里每一张图宛如同一位顶级画师用同一套画具画出，绝无画风跳变与代码硬画塑料感。**

---

## 一、全片锁死提示词“Style Anchor 骨架模板”

凡同一个影片工程，每次调用 `image-generator` 必须先加载本项目固化的 **Style Anchor Block（只换场景主体，严禁随意篡改画具与纸质词）**：

### 模板 A · 《勇敢的心》法式钢笔水彩绘本风 (`french-pen-watercolor`)
> **Style Anchor**: `2D French bande dessinee graphic novel illustration inspired by classic Great War watercolor storybooks, hand-inked dip-pen sepia-charcoal linework with expressive cross-hatching and subtle nib line-weight variation, muted translucent watercolor washes layered over warm fibrous cotton parchment paper (#E8DCC4), soft directional golden-ochre afternoon backlight casting long quiet shadows, restrained slate blue-grey and khaki-olive palette with a single selective vermilion red focal accent, atmospheric horizon haze, clean breathing space in upper corners and bottom margin, NO 3D CGI look, NO glossy plastic highlights, NO legible gibberish text, NO speech bubbles.`

### 模板 B · 十九世纪铜版雕刻纪年风 (`copperplate-chronicle`)
> **Style Anchor**: `19th-century historical copperplate intaglio engraving illustration printed on aged cream rag paper (#EFE6D2), razor-sharp warm carbon-black cross-hatching and parallel burin contour lines creating monumental tonal volume, subtle engraved stippling in skies, restrained vermilion editorial ink wash highlight on a single focal element only, classic museum folio composition, crisp borders, NO digital airbrush gradients, NO modern vector flatness, NO blurry smudge, NO gibberish text.`

### 模板 C · 东方水墨长卷科普风 (`ink-wash-scroll`)
> **Style Anchor**: `Traditional East Asian mineral pigment and sumi ink-wash handscroll painting on textured warm xuan paper (#EFEAD8), expressive calligraphic brush outline with varying dry-brush flying white and soft wet-in-wet capillary ink blooms in mountain mist, subtle mineral azurite blue and ochre wash tints, generous deliberate negative space (liubai) for poetic pacing and map annotations, horizontal scroll depth layers, NO western oil impasto, NO cartoon outlines, NO gibberish text.`

---

## 二、两种资产输出格式配方

### 配方 1 · 分层宽幅全景场景板（2.5D Pan/Parallax Scene Plate）
- **适用**：开场定场镜头、宏观群像场景、带有平滑左右推拉的绘本舞台。
- **结构后缀**：
  `wide cinematic 16:9 composition, clear separation between subtle background horizon (far), sharp hero action band (midground), and framing dark vignette silhouette (optional subtle bottom/side margin), keep bottom 14% calm and uncluttered for bilingual subtitles, ultra-crisp illustration detail, 1920x1080 aspect ratio.`
- **关键诀窍**：要求生图模型保持画面下沿 14% 与左上角 20% 区域干净柔化（少细碎杂物），为 Phase 2 的 HUD 与字幕预留天然呼吸空间。

### 配方 2 · 绿幕部件/角色精灵表（Chroma-Green Sprite Sheet）
- **适用**：需要按节拍逐个出现、在矢量地图上移动的小车/战舰/人物/印章（`comic-history-cutout` 或需要在矢量底图上叠加动效的 `✦` 风格）。
- **结构后缀**（供 `core/render/chroma_extract.py` 自动高精度切割）：
  `CLEAN ISOLATED ASSET SHEET ON SOLID FLAT CHROMA GREEN BACKGROUND (#00FF00), STRICTLY NO SHADOWS CAST ON GREEN FLOOR, NO GRADIENTS IN BACKGROUND, generous wide white-space gap separating each item on a neat 2x2 or 3x2 grid, every asset enclosed in crisp continuous dark dip-pen outer ink contour so edges cut cleanly without green spill, zero text labels next to sprites.`
- **严禁事项**：
  - 禁止画风不同的两个模型来回混画同一角色；
  - 角色/载具同一部件若需在不同镜头重复出现，**必须复用首次生成的高清图源或将其设为 `image-generator` 的视觉参考底图锁定外貌一致性**。
