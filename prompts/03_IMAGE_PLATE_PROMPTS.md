# `✦` 插画类项目生图提示词快速套用模板 (`03_IMAGE_PLATE_PROMPTS.md`)

> 当你在 Phase 4 准备资产或调优单一场景生图提示词时使用。完整细则见 `.agents/skills/style-visual-pk/references/prompt-recipes.md`。

---

## 1. 法式钢笔水彩 · 历史全幅背景板模板

```text
2D French bande dessinee graphic novel illustration inspired by classic Great War watercolor storybooks, hand-inked dip-pen sepia-charcoal linework with subtle cross-hatching and authentic nib weight, muted translucent watercolor washes over warm fibrous cotton parchment (#E8DCC4), soft directional golden-ochre afternoon light from top-left casting long quiet shadows, restrained slate blue-grey and khaki-olive palette with a single selective vermilion red focal accent, [在此填入具体历史场景内容与人物构图], wide 16:9 composition keeping the lower 14% uncluttered warm paper mist for clean subtitles and upper corners open for calendar HUD, NO 3D plastic CGI, NO modern lettering, NO random gibberish text, NO speech bubbles.
```

---

## 2. `#00FF00` 绿幕多动作精灵表模板（用于 `core/render/chroma_extract.py`）

```text
CLEAN ISOLATED SPRITE SHEET ON SOLID FLAT CHROMA GREEN BACKGROUND (#00FF00), STRICTLY NO CAST SHADOW ON GREEN FLOOR, NO BACKGROUND GRADIENTS, crisp 2D French dip-pen sepia ink outline around every silhouette perimeter so items slice cleanly without halo, restrained desaturated khaki/slate-blue watercolor fill matching warm 1914 storybook tone, neat 2x2 grid with wide empty green gap separating: (1) [左上部件], (2) [右上部件], (3) [左下部件], (4) [右下部件], zero printed labels, zero frame borders around grid cells.
```
