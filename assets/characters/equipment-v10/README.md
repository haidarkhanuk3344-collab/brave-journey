# v10穿戴头盔

helmet_steel.png 与 helmet_leather.png 通过内置 imagegen 生成，透明源图完整保留。对应 steel-prompt.txt / leather-prompt.txt 保存精确提示词。

由 equipment-visuals.js 的源矩形、66像素目标宽度和头部偏移决定穿戴。背包物品图标独立保留，ID、装备属性、存档字段保持兼容。

源透明矩形基于alpha>=128读取，运行时用最近邻绘制，露出正脸。装备随角色镜像、头部位置与轻微倾斜变化；武器按掌心挂点与不同动作携带角度绘制。质量标识仍独立处理。
