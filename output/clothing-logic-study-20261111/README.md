# Premade Character 衣服逻辑只读研究

对象：用户指定的 C:/Users/Administrator/Desktop/Hana Caraka - Base Character/Hana Caraka - Base Character/Premade Character。

## 观察
- 实际解析8个预设aseprite；衣服主体合画在body层，不是每件单独clothes图层。原文件未修改，源SHA256见report.json。
- 待机、行走、跑步、拾取三个方向共624个body帧与Basic对应body逐像素Alpha比较：442帧完全一致。其余不能用「全套仅换色」概括。
- 正面行走的body消除整体平移后，每款均3种RGBA图形；侧面均8种。说明除坐标外，还包括行高、双腿/脚步、阴影等变化。形状数含颜色变化，不能当作纯轮廓变形数。
- 查看Farmer裤装、Florist、Chef、Inn Keeper的正面行走body，以及Farmer/Inn Keeper/Florist侧面连续帧。裤腿的间隙随步伐变化；不同服装不能都按素体透明区硬裁。
- 当前衣服同步入口只支持original16_idle/walk/pickup/sit，未接入六个农耕动作。
- ClothingFit.fromIdle已有躯干按行映射、下方双腿分段、阴影迁移与高清分相复用；同时明确拒绝衣服画在素体透明区或描边位置，报「衣服超出身体区域；当前算法仅支持贴身款」。

## 实际试算
compare-base.cjs把预设待机首帧的body非原描边像素作为测试图案，套现有fromIdle（关闭自动腿阴影以区分映射与变色），对照原版连续帧。
- Farmer正面行走内部160个像素中148个颜色完全一致；侧面167个中120个一致。这不是视觉合格率，也不是已完成裤装算法。源图包含预设可见皮肤，不等于已经提取出纯衣服资产。
- Inn Keeper、Merchant测试源被现有贴身区域校验拒绝；Chef部分方向也拒绝。它同时排除描边上的衣服像素，所以拒绝不单独证明「有宽裙摆」，不能误标某款必为裙子。
- 所有试算均本地内存，未写工程、未改按钮或算法。

## 最小方案（待验证，不是已实现）
- 上身以颈/肩/腰的局部定位复用首帧，避免整身仅平移。
- 裤装让左右裤腿分别跟对应脚步，保留中缝与前后腿明暗。
- 裙装/围裙等跨腿衣摆以腰为基准保持连片衣料：不能按双腿间透明区挖洞；外沿只做小幅阶段变化，下面露出的腿照常运动。
- 衣料可以有自己的轮廓，不以「所有像素都在素体内部」为前提；但仍需范围/尺寸验证，不能简单删除全部校验。
- 下一步取一款裤装和一款明确的裙装，正/侧/背各一张待机首帧做试算；先区分拓扑（分腿或连摆），不需要复杂布料物理。袖子与手/工具遮挡尚需另看手层。

## 文件
analyze.cjs与report.json：原版分层、动作标签、形状数、SHA256；各角色方向动作body.png：最近邻放大帧条；compare-base.cjs与base-comparison.json：原版/基础素体Alpha与旧算法试算；pants-vs-hem.png：上排Farmer，下排Inn Keeper，不把下排标签强行写成裙装。
