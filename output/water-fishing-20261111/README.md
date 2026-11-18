# 浇水静止修正与钓鱼动作接入

已保存到base-outlined-1794365455561「新主工程 · 原版描边素体」。追加四段钓鱼：甩竿6帧、持竿4帧、收线6帧、上鱼6帧，各侧/正/背，共66帧；原有9套动作顺序、索引、尺寸和时长不变。

来源为用户指定Premade Character/Angler/angler.aseprite的四个fish标签。为避免将原预设的衣帽强加给用户，身体/手/鱼竿/VFX使用同包Fishing对应分层；头部采用Angler实际帧，转换到现有#FEEDE1/#E0C5B4/#46465E。保持原生像素，不缩放；四套画布分别45×48、33×48、35×47、37×51，以联合工具范围裁边但不截鱼线。工具原配色保留。新眼睛分层并延续当前眼睛下移1格的状态。没有引入原预设衣帽。

浇水三方向头发不再被默认阶段循环压形；用户随后进一步要求所有默认头发只整块跟头部呼吸位移，最终源码与全部头发帧保存结果见../hair-breath-only-20261111/README.md。

## 安全保存与并发
首次读取为218层，构建期间用户更新眼睛、拾取头部、新发型与显隐，保存前SHA前置检查失败，未发PUT。concurrent-save-blocked.txt和concurrent-diff.json记录实际变化。

随后以fresh.json/input.json的226层新稿为底重建，仅纠正浇水关联头发、给各头发配置追加新钓鱼偏移、追加新动作图层。原有眼睛/头部/发型新改动全部保留。save.cjs以input-meta.json原ETag保存成功；save-fresh.txt/save-response.txt/readback.json/readback-meta.json记录PUT200和完整回读一致。后续简化头发又做了一次保存，不应将此目录readback当作最终最新版本。

## 验证与原始记录
- build.cjs：候选构建、按原图层规范化前后比较，恢复既有PNG原编码，仅对授权图层替换像素；provenance.json保存五个源文件SHA256。
- baseline.txt：旧算法浇水阶段实际为0,0,1,1,1,0，新规则要求全0，退出1。
- test-fresh.txt：退出0；66帧、全部关联发型、浇水静止、头发与实际偏移一致、身体/头部不混入原渔夫肤色。
- browser-fresh.txt/browser-verification.json：隔离Edge13动作、单发型219生成帧、浇水静止、重开及39方向设置验证通过。真实API写入拦截。
- nine-browser.txt及其他hair/eye/slots日志：旧九动作按钮与既有回归通过。
- 5张contact PNG和5个GIF展示浇水及四钓鱼段，已目检。后一次新稿显隐隐藏了头发时，候选保持该显隐，不擅自显示旧发型。

实际命令使用现有NODE_PATH运行node build.cjs、node test/water-fishing.cjs、node test/water-fishing-browser.cjs和node save.cjs，无新增依赖。首次构建发现Angler与Fishing正面部分头部Alpha不同，没有强行当相同；改为采用用户指定Angler真实头部。另一次断言发现PNG重编码字节不同，改用同一导出规范化基线检查真实改动，并将未改图层原JSON/PNG编码恢复。两次原始失败日志均保留。

before/及source-sha256.json保存源码备份。初始218层稿和真正合并前226层稿均保留；恢复时不能用初始稿覆盖后来用户修改。工程恢复需先比较当前API内容并读取ETag，再通过If-Match回写input.json；必须保留最终简化阶段之后的用户修改。没有强制刷新前台，没有运行盲恢复脚本。
