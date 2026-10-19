# v15 森林冒险者

内置 imagegen 生成的透明 2D 卡通整帧人物与装备，原图、最终图集、提示词均保存在本目录。匹配 v14 森林怪物的粗描边、柔和阴影和暖色材质。参考冒险岛实机的大头比例、清晰发型轮廓和动作表达，采用原创人物与铜叶领巾识别标志。

- 男：短发、刺发；女：短发、长发、马尾。五套完整身体图集；不叠加旧头发，也不回退到分节肢体模型。
- 每套源图 64 个全身姿势。生产动作包括 idle/hurt/walk/run/jump、三种近战动作、远程动作。射手与法师复用远程身体姿势，分别挂弓、杖并使用原有弹道、光效与职业节奏。
- 帧格 256×256，脚底根点 [128,224]，站立高度约 146 原生像素，对应游戏 85 像素。保持原来的碰撞、跳跃、冲刺、攻击时序。
- 打包脚本检测每张源图的实际行间透明留白，保留外伸四肢、清除邻格碎片，并检查源裁切边界和最终动作边界。
- 每个性别/发型/动作独立测量头部、腰部、掌心挂点。头盔使用同性别短发底图并遮盖原有头发；新头盔面部为真实透明开口。
- 六种武器、两种头盔均使用新卡通图像。game.js 的图标映射同时应用于商城、背包、快捷栏、掉落物；不更改物品 ID 或数值。
- 显式性别优先；无性别的旧存档按原短发→男，长发/马尾→女兼容显示。正规化不修改读入对象，保留存档 version:1。

## 再生成和验证

提示词：prompts.json、gear-prompts.json。源图：*-source.png；装备最终源：gear-open-source.png。

```sh
python3 scripts/pack-characters-v15.py
python3 scripts/pack-gear-v15.py
node scripts/preview-characters-v15.cjs
node tests/character-appearance.test.cjs
node tests/fullframe-motion.test.cjs
node tests/hairstyle-rendering.test.cjs
```

帧图只是有限的关键姿势；动作质量仍以游戏实际运行和玩家体验为准。后续可继续增加职业专属远程身体帧和衣服素材，沿用相同挂点与存档字段。
