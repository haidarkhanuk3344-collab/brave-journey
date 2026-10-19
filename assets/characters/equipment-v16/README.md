# 装备动作适配 v16

人物仍使用 cartoon-v15 的整帧动作。这里提供原始动作的前景手臂遮罩、逐帧头盔姿态，以及新绘制的铠甲/皮衣/法袍胸部与下摆。

- `garments-source.png`：通过内置 imagegen 生成的原始透明 3×2 装备图，参照 v15 的卡通画风。
- `*-chest.png` 与 `*-hem.png`：源图裁切后的装备部件。
- 五个造型目录：从原始动作测量得到的前景手臂，保留原始手、手臂、袖口与轮廓，不重建肢体。
- `manifest.json`：前景图路径、逐帧头盔倾角与前景像素数量。

重建：`python3 scripts/pack-equipment-masks-v16.py`、`python3 scripts/pack-garments-v16.py`。

胸甲纹理只写入原始上衣轮廓；下摆跟随躯干；头盔后重绘真实前景手臂；武器仍使用原有手掌和射击原点。
