# hurt侧面首帧坐姿试版
用户指定截图hurt.png的侧面第一帧，实际源Basic/hurt.aseprite，hurt标签索引0。仅更新新主工程original16_sit的side第1帧五个部件cel（body/head/hand/hand2/眼睛）和该帧来源备注；正背坐姿、其他动作、其他图层、工程选择保持不变。
16×16，无缩放/裁切，使用当前FEEDE1/E0C5B4/46465E三色。原图的横向闭眼保留并拆至眼睛层；拆分后合成逐像素等于配色后的源帧。未改按钮、未刷新前台、未扩动画、未适配头发衣服。
original.json与meta.json保存原API字节/SHA256/ETag；hurt.aseprite保留源文件，verification-pre.json含源SHA256与修改索引。前后图已看。PUT前重新GET并检查原ETag，PUT/GET200，readback.json逐字节等于candidate。
恢复：仅当当前API ETag仍为verification-saved.json的保存版本，才可用该If-Match PUT original.json后回读；若已有后续编辑，先做差异合并，只还原本次侧面五个cel与来源备注，勿盲传旧整稿。未运行恢复脚本。
