# 战士走跑帧 v7

内置 image_gen 生成，身份参考为`../fullframe-v4/warrior-idle-00.png`。

- `walk-prompt.txt`：最终走路生成的完整准确提示词。
- `run-prompt.txt`：最终跑步生成的完整准确提示词。
- `warrior-walk-source.png` / `warrior-run-source.png`：有原生透明通道的生成源图。
- 走跑图集4列×2行，格子256×256，根点[128,224]；每套8帧。
- 走路周期112游戏像素，跑步周期168游戏像素。
- 逐帧高度以一套统一比例整理，不对单帧独立拉伸；跑步帧3/7保留10像素离地。
- 清单其余动作引用`../fullframe-v4/`已有图，避免替换攻击命中时序。
- 整理脚本`../../../制作工具/整理动作帧_v7.py`。

实际验证见`../../../verification/equipment-motion-v7/说明.md`及`motion-play.mp4`。
