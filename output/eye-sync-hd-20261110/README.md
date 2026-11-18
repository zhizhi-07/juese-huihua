# 眼睛同步：侧面坐姿下移 1 格、保留高清源像素

- 只改编辑器联动代码与测试，未写工程。隔离浏览器从 /api/status 查得当前素体，GET 备份原响应；禁止非 GET API 请求；结束回读 ETag 与 SHA256 一致。
- 两次「同步全部」：四帧相对待机基准的 Y 从 [0,0,1,1] 变为 [1,1,2,2]，没有累加；22×8 源、11×4 放置尺寸和 RGBA 全部相同。已有 2× 源在改前也未被同步按钮重采样，但头发飘动窗口把人物预览画到了 16×16；改后按源密度画到 32×32。
- 按当前规则保留待机基准和标记为保留原画的帧，头发摆动、定位规则不变。
- 记录：baseline.log、after.log、browser.log。eye-sync-ui.cjs 改前改后均在旧的场景测试桩 PE.isSceneProject 缺失处失败；隔离浏览器的同步按钮和飘动预览测试通过。
- 恢复：若没有后续改动，把 before/js/hair-animation.js、before/index.html、before/test/eye-sync.cjs 分别复制回同名路径，并和 sha256.txt 核对。如果有后续编辑，只反转本次 patch。工程没有写入，无需恢复。
