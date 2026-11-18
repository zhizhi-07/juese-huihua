仅坐姿背面4帧双手各向内1原生像素。双手在hand2同层，按2个连通块分别左手X+1/右手X-1；空hand层不动。24个手部像素每帧完整保留无重叠裁切。其他像素、动作、画布、节奏、前侧方向均不变；还原本次4个cel后整个JSON等于原API。前后成图已看。
PUT前GET检查原字节/ETag，按原If-Match保存，PUT/GET200，回读逐字节等于candidate。未刷新前台。
恢复：original.json/meta.json保存原响应/SHA256/ETag；保存版见verification-saved.json。仅当当前API仍为保存ETag时，按其If-Match PUT original并回读；已有后续修改则先合并本次4个背面手cel，不用旧稿整体覆盖。未执行恢复。
