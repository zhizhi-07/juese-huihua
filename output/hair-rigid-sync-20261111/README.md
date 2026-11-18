# 头发默认改为整块跟头（2026-11-11）

## 本次实际修改
- js/hair-animation.js：删除首次关联原生16头发时自动启用nativeTips/飘动的代码。新关联默认为整块按标定头部偏移平移。
- 已保存nativeTips自动配方：生成时不再建立发梢区域、不再计算上一帧速度差，不执行轨迹/补全变形，保留原设置字段和原首帧。再次同步或实时刷新时生成刚性跟随结果，无需先改工程JSON。
- 原有明确手动配置的非nativeTips高级效果保留；主动编辑高级参数会移除该范围的旧nativeTips标记，防止高级编辑失效。没有删除高级飘动工具。
- index.html：更新头发脚本缓存版本。
- test/hair-nine-live-browser.cjs：保留旧版基线，现代按钮期望改为独立画布平移后的逐像素比较，不再使用旧发梢滞后生成图作答案。
- 新增test/hair-rigid-sync.cjs：默认不启用效果、旧自动配方刚性兼容、越界像素保留、重开稳定检查；输出合成连续帧图。

未实现自动A/B修形：原版不是简单删行，未经验证不裁切用户发型。默认保持首帧完整形状。没有新增动作、恢复坐姿方向、改衣服或改颜色。

## 验证与原始日志
输入为本工作区已保存的 `output/hair-live-nine-20261111/latest-study/original.json` 测试快照，不声称已经替用户当前工程保存新生成帧。

运行命令（工作目录为角色绘画）：
```
$env:NODE_PATH='C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node test/hair-rigid-sync.cjs
node test/hair-nine-live-browser.cjs
node test/hair-animation.cjs
node test/eye-sync.cjs
node test/hair-slots.cjs
```
- baseline.txt：修改前针对新规则的测试实际失败，脚本AssertionError退出1，证据为新建native16联动enabled=true。
- rigid-test.txt：最终退出0；153个生成帧逐像素保持源形状（包括画布外），旧nativeTips不再滞后，plan不改原像素，重复/重开一致。
- browser-test.txt、browser-verification.json：隔离Edge实际按钮、实时复选框；156帧（含三个原首帧）与独立刚性平移一致，0裁切；单步撤销/重做、编辑基准实时联动、还原基准、导出/重开、其他原图层像素保护、眼睛范围全部通过。真实API非GET请求全部拦截，无工程写入。
- hair-animation.txt、eye-sync.txt、hair-slots.txt：三个既有回归全部退出0，显式高级效果仍兼容。
- service-verification.json：GET服务脚本及页面，与磁盘逐字节一致，退出0。
- rigid-contact.png：正/侧待机、正/侧行走连续帧，已实际打开目检。图为测试快照合成，不是用户前台截图。
- 出图首次因测试canvas缺少style属性报错，补测试桩后重跑通过；没有改生产canvas代码。没有安装依赖。

## 使用
先在前台保存自己的未保存草稿，再自行重新打开页面加载新脚本，选择待机头发点“同步全部”或启用实时同步。不会替用户强制刷新前台；当前仍打开的旧页面可能继续运行旧脚本。

## 备份、差异、恢复
before/保存原始hair-animation.js、index.html及原按钮测试；before-sha256.json是最初源码SHA256，file-sha256.json含最终及备份SHA256。三个patch记录本次差异（git diff --no-index返回1表示存在差异，不是测试失败）。

若没有后续修改，可将before/hair-animation.js恢复至工作区js/hair-animation.js，将before/index.html恢复至工作区index.html，将before/hair-nine-live-browser.cjs恢复至工作区test/hair-nine-live-browser.cjs。若已有后续代码改动，按patch反向合并，不整文件覆盖。test/hair-rigid-sync.cjs是新增回归，可保留；回退旧行为后该测试预期失败。没有写工程，不需要回滚工程。未生成或声称验证恢复脚本。
