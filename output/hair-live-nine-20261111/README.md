# 九动作头发实时同步接入

## 本次修改
- js/hair-animation.js：头发新增六个农耕动作；新建原生16规格联动默认开启本次已验证的局部发梢跟随（头顶/刘海不额外动，纵向滞后最多1格）。原有已保存联动设置不迁移；眼睛保持原动作范围。三方向待机首帧不覆盖。缺首帧的方向跳过，不清空原帧。
- js/core.js：精确名称「头发」加入现有分类，内部沿用前发绘制槽位，不要求拆图或改名，不更改用户层名。
- index.html：更新两项脚本缓存版本。
- test/hair-nine-live-browser.cjs：隔离浏览器按钮回归。真实API的全部非GET请求被拦截，不写用户工程。

## 已验证
- baseline-test.txt：旧版既有头发单测通过；隔离旧源码中「头发」未被识别，换已识别的测试名后旧版仅关联3套动作，默认无局部跟随。
- browser-verification.json：最新用户画稿156帧与研究结果逐像素一致；三首帧原样、0裁切；勾选实时同步后修改首帧可更新其他动作；重复同步稳定；一步撤销/重做；导出重开稳定；原层像素未改；眼睛保持3套动作。
- regression-hair.txt、regression-eyes.txt、regression-order.txt：旧头发、眼睛及前后层序回归通过。
- service-verification.json：服务提供的3文件与磁盘逐字节相同。
- button.png：隔离页面截图已查看。真实用户前台没有刷新，也没有自动保存。

## 当前工程
用户在工作期间又保存过头发（相较前次试稿只有头发层和当前方向变化），最终验证使用重新读取的latest-study/original.json，不覆盖其新改动。最终API与该快照一致。不能把它写成与前次试稿ETag始终不变。

## 使用
先保存自己的未保存草稿，再自行重新打开编辑器加载新脚本。在待机「头发」层勾选「头发实时同步」或点「同步全部」，会以三方向首帧生成其余153帧。已经关联的旧发型保留原设置，不自动升级配方。

## 命令
PowerShell先设置已存在运行库（无需安装）：
$env:NODE_PATH='C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node test/hair-nine-live-browser.cjs output/hair-live-nine-20261111/latest-study
node test/hair-animation.cjs
node test/eye-sync.cjs
node test/hair-slots.cjs

最初运行旧测试缺少NODE_PATH，找到现成依赖后重跑通过。试验比较半透明工具原PNG与浏览器重绘出现取整差异，原层保护检查已改为比较导入时的内存原像素，避免把正常预乘往返误报为修改。没有以跳过检查替代验证。

## 恢复
before/保留本次修改前3个文件和SHA256记录；*.patch只记录本次差异。需要恢复时，在没有后续源码变更的情况下恢复这3个备份；已有后续修改应按patch逐项反向合并，勿整文件覆盖。工程从未PUT，无工程回滚需求。未编写/执行恢复脚本。

## 尚未处理
衣服算法未改；长发/马尾通用性未验证；按帧计算局部滞后不是连续时间物理模拟；真实前台的未保存草稿无法通过API判断。
