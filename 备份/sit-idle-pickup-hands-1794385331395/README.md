# 正背坐姿：待机身体 + 拾取双手
用户明确正背身体其实用待机，仅双手换成本方向拾取首帧。新主工程original16_sit正背各替5个cel：body/head/眼睛从本方向idle第1帧复制，hand/hand2从本方向pickup第1帧复制。拾取与待机画布原点不同，以头部中心/顶部对齐，双手偏移均(-3,-1)，不缩放，所有源非透明像素均保留。15×17待机底稿仅去掉透明边，坐姿画布仍16×16。
侧面hurt首帧不变，原待机/拾取/其他动作和其他设置不变。反向替回10个cel及2条来源备注，整个JSON深比较等于original。已看三方向成图；备份含原SHA256/ETag。PUT前重取确认原字节和ETag，按原If-Match保存，PUT/GET200，回读逐字节等于candidate。未刷新前台或改变按钮/动画。
恢复：仅当当前API ETag仍为verification-saved.json的版本时，才可按该If-Match PUT original.json并回读；有后续编辑则先合并，只还原本次正背10个cel与2条备注，不盲传旧整稿。本次未回滚。
