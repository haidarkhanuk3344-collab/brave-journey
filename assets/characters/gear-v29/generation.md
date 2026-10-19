# v29 头盔

使用内置 image_gen 生成。输入是原角色待机帧与旧皮盔，输出为六格透明图集，切分后保留生成 alpha。原素材未覆盖。

## 最终提示词

Use case: precise-object-edit / game production equipment atlas. Input 1 is existing character style and proportions to fit, input2 is current leather helmet that needs replacing. Create a brand-new transparent helmet atlas, exactly THREE columns x TWO rows, generous equal cells and gutters. Row1: brown leather adventurer cap in right-facing three-quarter view, front view, near side view facing right. Row2: silver-blue open-face adventurer helmet same three views. SIX EMPTY HELMETS ONLY; absolutely no heads, hair, eyes, skin, faces, mannequins, necks, labels, text, drop shadows. All face openings and exterior must be actual transparent alpha. Helmets should fit the reference character's rounded skull snugly, smaller/shallow crowns, brow rim just above eyebrows, one small copper leaf badge, short rear-side ear protection but FULL OPEN FACE, no long forward cheek flaps dangling beside the nose and mouth. Leather: muted warm chestnut softly brushed, few simple broad seams, no dozens of bright stitches. Steel: soft brushed desaturated slate-silver panels, warm reflected light, tiny restrained brass trim. Material style: softly painted 2D fantasy storybook, fine warm gray-brown contours, natural diffuse light top left, gentle shade lower right, soft edge transitions, no thick black stroke, no sticker outline, no photo, no glossy 3D, no pixel art. Keep front and three-quarter silhouettes mutually coherent; eyebrow opening geometry must accommodate big chibi eyes. Each object fills around 75% cell. Deliver high resolution genuinely transparent RGBA PNG.

## 生产素材

- helmet-source.png：生成原图
- helmet_leather.png / helmet_steel.png：3/4 朝向
- helmet_leather-front.png / helmet_steel-front.png：正面
- helmet_leather-side.png / helmet_steel-side.png：侧面备用，当前动作没有启用
- crops.json：原图切分边界

绘制时根据原动作的头部轮廓逐帧贴合；预览、装备及实战均使用 fullframe-motion.js。
