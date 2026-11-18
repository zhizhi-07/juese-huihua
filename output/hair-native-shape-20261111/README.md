# 颜色无关的两态头发压形｜第一版

## 实际行为
改动工作区js/hair-animation.js共用生成路径及index.html缓存版本。默认原生16头发同步现在是“头部锚点平移 + 离散A/B形态”，不再是完全刚性，也不恢复连续发梢滞后。

- A复用首帧形状。B仅根据Alpha像素求上下界，按实际高度选中部交界，将下部源像素向上挤1个原生像素；顶部不作整块抬升。
- 不检测RGB、亮暗、阴影方向或发型名称；源RGBA整体搬运，不重画高光，不添加新颜色。压形交界发生重叠时下方源像素优先，因此可能省略一行细节，不能声称所有源像素/颜色都必然出现在B态中。
- 待机四阶段A B B A，行走八阶段B B A A B B A A，拾取六阶段A B B B A A。其他已有动作按A B B A归一化分段；不添加或恢复动作。动作首帧保护仍由原流程处理，待机各方向首帧不写。
- 变化按帧阶段切换，不以头部速度、正弦或经过时间驱动。改变帧时长不改变对应帧形状。
- 没有新增保存字段。原生16、未主动开启高级效果的既有联动也走新默认规则；旧nativeTips自动配方同样走两态，不走速度滞后。明确手动配置的非nativeTips高级效果维持原规则。
- 存在明确自定义可动/保护区域、轨迹或补全时，不叠加默认压形，避免绕过人工设置。
- 高清放置层不重采样，仍整体跟头；极小/空图安全保持原形。32规格既有规则不迁移。眼睛不参与压形。

这是形状规则通用的最小近似，不是Merchant手绘帧复刻，也不是识别刘海、发旋、辫子结构的语义模型。复杂装饰和一像素细线可能需要人工修正。

## 输入与不改动范围
真实用户测试输入：output/hair-live-nine-20261111/latest-study/original.json已保存快照（三方向头发）。参考输入：用户指定merchant-original-1794364657183的本轮前面只读快照，不复制其阴影模板。

没有PUT真实工程，没有改原参考素材，没有刷新用户前台或覆盖草稿。测试包含九套已存在动作，只验证既有覆盖范围，不代表恢复额外动作。当前实际工程需用户自行加载脚本并点击同步后才生成，不能把隔离试算说成已写回当前画稿。

## 产物
- two-state-preview.gif：六份真实方向画稿，头部位置固定。上排始终为原形，下排按A B B A切换；展示内部像素也在变化。演示每帧200ms，特意比测试快照100ms放慢一倍便于观察，不修改工程时长。
- demo-0..3.png：上述动图原始帧，已查看demo-1。
- user-contact.png：测试快照中正/侧待机、行走的人物合成连续帧，已实际打开目检。
- shape-fixtures.png：短/中/长/马尾四个合成轮廓，各两套任意颜色，仅用于边界与配色无关性测试，不冒充四款真实商业发型的视觉验收。
- preview-stats.json：三方向用户头发A/B共有不透明区中分别4/4/29像素变化；Merchant分别5/6/17。是画稿内部颜色随形状映射，不是生成阴影。
- before/、before-sha256.json、file-sha256.json与四个patch：修改前备份、原始与最终SHA256、差异。

## 命令和结果
工作目录为本工作区，现有依赖通过以下环境变量读取，无新增安装：
```
$env:NODE_PATH='C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node test/hair-native-shape.cjs
node test/hair-rigid-sync.cjs
node test/hair-nine-live-browser.cjs
node test/hair-animation.cjs
node test/eye-sync.cjs
node test/hair-slots.cjs
node output/hair-native-shape-20261111/preview.cjs
magick -delay 20 output/hair-native-shape-20261111/demo-0.png output/hair-native-shape-20261111/demo-1.png output/hair-native-shape-20261111/demo-2.png output/hair-native-shape-20261111/demo-3.png -loop 0 output/hair-native-shape-20261111/two-state-preview.gif
magick identify -format '%n frames %wx%h delay=%T\n' output/hair-native-shape-20261111/two-state-preview.gif
```
- baseline.txt：实现前新测试失败，缺少通用映射函数，退出1。
- hair-native-shape-final.txt：退出0；四轮廓双配色逐像素映射一致、顶部/源图不改、无新色、A/B阶段、HD/小图安全、153生成帧0裁切、人工保护不绕过、旧自动配方兼容、时长无关、重开一致。
- hair-rigid-sync-final.txt：退出0；更新原测试为明确零强度高级配方的刚性控制组，仍保留153帧精确平移、越界像素和原图保护检查，不用旧刚性默认期望阻止新规则。
- browser-test.txt、browser-verification.json：隔离Edge实际按钮/实时复选框，156帧（含3源首帧）与独立像素映射参考一致；撤销重做、重复同步、改源实时更新与还原、导出重开、原有其他图层保护、眼睛范围、0裁切通过。真实API全部非GET请求拦截。
- hair-animation-final.txt、eye-sync-final.txt、hair-slots-final.txt：既有回归均退出0。
- service-verification.json：最终服务脚本/页面与磁盘逐字节一致，Merchant参考工程API回读SHA256不变。
- gif-verification.txt：实际回读4帧900×380，每帧20厘秒。最终PNG也已目检。

预览脚本第一次漏载core导致PE.utils缺失，补载实际共用实现后重跑退出0；没有改生产逻辑绕过失败。git diff --no-index返回1表示有差异，不是测试失败。

## 使用和恢复
先保存未保存草稿，再自行重开编辑器加载新脚本。在待机头发上点击“同步全部”或启用实时同步即可。没有强制刷新。

需恢复且没有后续改动时：将before/hair-animation.js复制回工作区js/hair-animation.js，before/index.html复制回index.html，两个before测试文件分别复制回test同名文件。新增test/hair-native-shape.cjs可保留作后续回归，旧实现下该测试应失败。有后续代码变更则按patch反向合并，不整文件覆盖。没有工程写入，故不需要工程回滚；未编写或声称验证恢复脚本。
