# 跳跃末帧作为侧面坐姿试版
- 对象：base-outlined-1794365455561（新主工程），只新增original16_sit → side → 第1帧。
- 实际源：素材包Basic/jump.aseprite，不在Attack；jump标签第6帧（索引5），100ms。只取侧面的hand 2/body/head/hand，未导入VFX、正面、背面或其他跳跃帧。
- 仅将原肤色/阴影/描边转换为FEEDE1/E0C5B4/46465E；16×16、不缩放、不改姿势。头部眼睛按本工程已有规范拆层，补回同色皮肤，合成与配色后的原帧逐像素一致。
- 原工程13套动作与全部原图层/当前选择均深比较不变。新增1动作、1方向、1帧。没有覆盖旧坐姿（保存前确认新主工程不存在坐姿）。
- PUT前重新GET，确认原字节与ETag一致；PUT使用最初ETag。PUT/GET均200，readback.json与candidate.json逐字节一致。验证结果见verification-pre.json与verification-saved.json，原API字节/SHA256/ETag见original.json/meta.json。
- 源文件备份jump.aseprite与SHA256已留。未修改源素材、其他工程、实时同步按钮、用户前台页面。

恢复：仅当当前API ETag仍等于verification-saved.json的etag时，可用该If-Match将original.json PUT回同一URL并回读验证；若已有后续编辑，先合并差异，只撤销本次新增动作/图层，不用旧整稿覆盖后续内容。本次没有回滚或运行恢复脚本。
