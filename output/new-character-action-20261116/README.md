# 新建人物动作 · 验证与恢复

## 使用
先保存当前页面草稿，再重新打开编辑器。左侧「动作素材 → ＋ 新建动作」，输入名称。
复制当前工程的16规格待机全部方向、全部帧及分层（不复制其他动作）。右侧「身体」可选前手/后手及现有描边层调整。
新稿是独立绘画副本：解除复制稿锁定，不继承底稿联动或头发/衣服自动同步归属。原待机、坐姿和其他动作不变。
当前没有16规格待机或独立手层会报错停止，不回退旧模板。未增加动作重命名/删除及新建动作级撤销；画手的撤销/重做正常。

## 本次实际改动
- js/character-actions.js：验证名称/容量/层级；深复制当前待机、像素和高清放置，映射父组/帧号；复制稿手部解除保护。
- js/studio.js：人物动作新建按钮；场景工程隐藏。
- js/visual-layers.js：让任意命名的新动作复用既有「待机副本」图层分类。
- js/export.js：导入/导出copiedFromIdle标记，保存后重开仍有图层分类。
- index.html：加载新脚本与缓存版本。

## 验证（真实退出状态）
| 命令 | 退出 | 结果 |
|---|---|---|
| node test/new-character-action-browser.cjs（改前） | 1 | 缺少新建动作按钮，before-test.log |
| node test/new-character-action-browser.cjs（改后） | 0 | 输入取消、空白、重复/保留名称不改工程；三方向12帧及图层复制；前后手/描边解锁；真实鼠标画手、撤销/重做；ETag条件保存与重开；场景只显示新建素材 |
| node test/new-character-action.cjs | 0 | 从当前素体API快照复制：3方向12帧、184个独立cel、6个可编辑手层；源工程完整不变；导出重开；高清放置无共享；缺待机/手、坏层级和容量限制原子失败 |
| node test/scene-materials-browser.cjs | 0 | 新建/改名场景素材、整帧复制、条件保存重开 |
| node test/branch-hands.cjs | 0 | 旧分支手层、源映射、像素/显隐同步与锁定保护 |
| node test/visual-layers.cjs | 0 | 图层分类、卡片、分组、改名、撤销/重做 |
| node test/layer-controls.cjs | 1 | 4项旧排序断言失败；改前源码副本同样4项失败，未修改该排序逻辑 |
| node --check（character-actions/studio/export/visual-layers） | 0 | 语法通过 |
| restore-code.ps1 -Workspace output/new-character-action-20261116/restore-check | 0 | 额外副本恢复并逐文件SHA回读通过，最终代码未恢复 |

浏览器测试的API PUT全部拦截；没有保存用户真实工程。model测试只GET当前源工程，base-api.json为原始响应，base-api-meta.json记录ETag和SHA256；末尾再次GET确认SHA未变。
browser.png为合成图层测试；actual-source-preview.png为当前素体保存快照的隔离新动作预览（不是用户前台，也未保存）。
初次测试的PNG编码差异改为解码像素比较；测试鼠标坐标和空层匹配已纠正。基线测试首次缺workbench依赖，补齐后才对照确认旧失败。

## 备份、差异与恢复
manifest.json列出现版与备份SHA256；changes.patch是相对本次备份的差异，而非相对Git历史（工作区已有其他改动）。
index.html、studio.js、export.js在编辑前复制并记录SHA256。visual-layers.js漏做编辑前字节快照，before中的该文件由已核对的单行改动反向复建；仅保证改前逻辑内容，不声称是编辑前采集的原始字节哈希。core.js未修改。
恢复命令（仅在需要撤销本次程序修改时执行）：

```powershell
& 'C:\Users\Administrator\Desktop\角色绘画\output\new-character-action-20261116\restore-code.ps1'
```

脚本先校验所有目标仍等于本次交付SHA，再还原备份并移除本次新脚本；任何文件已被后续修改就停止，防止覆盖。不会修改工程JSON。已在restore-check额外副本上执行并回读验证。
未覆盖用户草稿、未刷新前台、未跑完整历史测试；旧衣服/界面待办未动。

补充：已在当前素体快照隔离页查看新动作与手部卡片（source-preview.log退出0）；模型测试额外调用真实character-sync.js分支继承函数，确认新动作手层不会被重新锁定或覆盖，重跑退出0。
