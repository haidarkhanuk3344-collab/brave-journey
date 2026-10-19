# v12 开源代码与视觉参考

本游戏仍为现有 Canvas 单机版本。实际移植两段 MIT 代码，未引入 Phaser/Godot 引擎，未复制整套游戏。

## Ourcade
- 仓库：https://github.com/ourcade/phaser3-dungeon-crawler-starter
- 源：`src/characters/Faune.ts`，blob `9abc75d2bd1cda24e743bb561d96748bdda1624e`
- `vendor/combat-vector.js` 改写 `throwKnife`：方向向量 → 弹道角度、发射位置和速度。用于疾风三连、贯穿蓄力箭、炎爆法球。
- Copyright (c) 2019 ourcade；完整许可 `vendor/ourcade-LICENSE`。

## GDQuest
- 相似横版项目：https://github.com/gdquest-demos/godot-platformer-2d
- 源：`game/src/Player/Camera/ShakingCamera.gd`，blob `5e90e39e232964a630ed9591640844ba89237359`
- `vendor/camera-damping.js` 移植 `_process` 的计时衰减镜头偏移；JS 秒计时替换 Godot Timer，正弦偏移替换随机偏移。
- Copyright (c) 2019 Nathan Lovato；完整许可 `vendor/gdquest-LICENSE`。
- `Hit.gd`、`HitBox.gd` 仅用于研究，无代码移植。

## Pinterest 视觉参考
- 技能特效搜索：`技能特效 pixel art`、`pixel art skill effects`
- https://www.pinterest.com/pin/607774912254839904/ — Free Pixel Effects Pack by CodeManu
- https://www.pinterest.com/pin/302726406187616296/ — Simple Attack Animation | Pedro Medeiros
- https://www.pinterest.com/pin/394276142379572264/ — Pixelblog - 9 - Melee Attacks | SLYNYRD
- 人物攻击搜索：`人物攻击流程图 pixel sprite attack`
- https://www.pinterest.com/pin/676173331569155023/ — 怪物蓄力、挥击、收势逐帧参考
- https://www.pinterest.com/pin/70509550411993347/ — Prototype Zombie Sprite Sheet Pixel Art Pack
- 怪物动作搜索：`怪物流程图 pixel sprite monster attack`

Pinterest 图片仅作视觉参考。九技能的几何特效为自行编写的 Canvas 绘制，没有拷贝这些美术素材。研究文件保存在 `references/skills-v12/`，不作为运行依赖。
