/**
 * Automated Test Suite for Pixel Character Editor
 * Covers: slicing, pixel reading, bounds checking, lock protection,
 * multi-layer drawing, undo/redo, inspection validation, and PNG export-reimport roundtrip.
 */
(function() {
  'use strict';

  window.runPixelEditorTests = async function(outputCallback) {
    const results = [];
    const log = (msg, status = 'info') => {
      console.log(`[${status.toUpperCase()}] ${msg}`);
      if (typeof outputCallback === 'function') {
        outputCallback({ message: msg, status });
      }
    };

    const assert = (condition, testName, details = '') => {
      if (condition) {
        results.push({ name: testName, pass: true, details });
        log(`✓ PASS: ${testName} ${details ? '(' + details + ')' : ''}`, 'pass');
      } else {
        results.push({ name: testName, pass: false, details });
        log(`✗ FAIL: ${testName} - ${details}`, 'fail');
      }
    };

    log('================ 开始像素角色编辑器全量自动化测试 ================', 'info');

    try {
      // 准备工作：确保应用与项目初始化
      const app = window.PE?.app;
      if (!app) {
        throw new Error('window.PE.app 尚未初始化');
      }
      const project = app.project;
      const api = window.pixelAPI;
      if (!api) {
        throw new Error('window.pixelAPI 尚未初始化');
      }

      // ----------------------------------------------------
      // 测试阶段 1: 真实动作素材导入与切帧验证 (Slicing)
      // ----------------------------------------------------
      log('--- [1/8] 动作表素材导入与切帧测试 ---', 'info');
      const resp = await fetch('assets/sample_character.png');
      if (!resp.ok) throw new Error(`获取素材失败: HTTP ${resp.status}`);
      const blob = await resp.blob();
      const file = new File([blob], 'sample_character.png', { type: 'image/png' });

      await app.sheetManager.importFile(file, project);
      const sheetIndex = project.spriteSheets.length - 1;
      const sheet = project.spriteSheets[sheetIndex];

      assert(sheet.imageData.width === 128 && sheet.imageData.height === 32, '素材大图尺寸正确', '128x32');

      // 设置 4 列 1 行，每帧 32x32
      sheet.frameWidth = 32;
      sheet.frameHeight = 32;
      sheet.columns = 4;
      sheet.rows = 1;
      sheet.spacingX = 0;
      sheet.spacingY = 0;
      sheet.offsetX = 0;
      sheet.offsetY = 0;

      const cutRes = app.sheetManager.cutFrames(project, sheetIndex);
      assert(cutRes.totalFrames === 4, '成功切分为4个动作帧', `实际总帧数: ${cutRes.totalFrames}`);

      const frame0 = sheet.actions[0].frames[0];
      assert(frame0.width === 32 && frame0.height === 32, '单帧宽高符合配置', '32x32');
      assert(frame0.sourceX === 0 && frame0.sourceY === 0, '帧0源偏移坐标正确', '(0,0)');
      const frame3 = sheet.actions[0].frames[3];
      assert(frame3.sourceX === 96 && frame3.sourceY === 0, '帧3源偏移坐标正确', '(96,0)');

      // 检查 Layer 0 原始图层
      const layer0 = project.layers.find(l=>l.sheetIndex===sheetIndex && l.isOriginal);
      assert(layer0 && layer0.isOriginal === true && layer0.locked === true, '原始图层正确创建并默认锁定', layer0?.name);

      // ----------------------------------------------------
      // 测试阶段 2: 像素读取 API 测试 (Pixel Reading)
      // ----------------------------------------------------
      log('--- [2/8] 像素读取 API 测试 ---', 'info');
      project.currentSheetIndex = sheetIndex;
      project.currentActionIndex = 0;
      project.currentFrameIndex = 0;
      app.canvasManager.render();

      // 在 (14, 9) 处应有眼睛暗色像素
      const eyePixelRes = api.getPixel(sheetIndex, 0, 0, 14, 9);
      assert(eyePixelRes.success && eyePixelRes.data.a === 255, '成功读取单像素', `色值: rgba(${eyePixelRes.data.r},${eyePixelRes.data.g},${eyePixelRes.data.b},${eyePixelRes.data.a})`);

      // 在 (0, 0) 处应为透明背景 (a === 0)
      const bgPixelRes = api.getPixel(sheetIndex, 0, 0, 0, 0);
      assert(bgPixelRes.success && bgPixelRes.data.a === 0, '透明背景像素读取正确', `透明度 alpha: ${bgPixelRes.data.a}`);

      // 读取原始缓冲区 Uint8ClampedArray
      const rawRes = api.getFrameRawRGBA(sheetIndex, 0, 0);
      assert(rawRes.success && rawRes.data.length === 32 * 32 * 4, '原始RGBA缓冲区长度符合 32x32x4', `${rawRes.data.length} 字节`);

      // ----------------------------------------------------
      // 测试阶段 3: 像素边界越界拦截测试 (Out-of-bounds Check)
      // ----------------------------------------------------
      log('--- [3/8] 像素越界拦截测试 ---', 'info');
      // 创建一个可编辑图层
      const addLayerRes = api.addLayer('编辑测试图层');
      const testLayerIdx = addLayerRes.data.layerIndex;
      assert(addLayerRes.success, '成功创建编辑测试图层', `图层索引: ${testLayerIdx}`);

      // 传入包含合法像素与越界像素的混合数组
      const boundaryTestPixels = [
        { x: 5, y: 5, r: 255, g: 0, b: 0, a: 255 },     // 合法
        { x: -1, y: 5, r: 255, g: 0, b: 0, a: 255 },    // 负坐标越界
        { x: 32, y: 10, r: 255, g: 0, b: 0, a: 255 },   // 超出宽度越界
        { x: 10, y: 35, r: 255, g: 0, b: 0, a: 255 }    // 超出高度越界
      ];

      const drawBoundaryRes = api.setPixels(testLayerIdx, sheetIndex, 0, 0, boundaryTestPixels);
      assert(drawBoundaryRes.success, 'API响应成功', '包含部分拒绝');
      assert(drawBoundaryRes.modifiedPixels === 1, '仅1个合法像素被写入', `修改数: ${drawBoundaryRes.modifiedPixels}`);
      assert(drawBoundaryRes.rejectedPixels.length === 3, '3个越界像素被拦截', `拒绝数: ${drawBoundaryRes.rejectedPixels.length}`);
      assert(drawBoundaryRes.rejectedPixels.every(p => p.reason === '超出帧边界'), '拒绝原因明确为超出帧边界', drawBoundaryRes.rejectedPixels[0].reason);

      // ----------------------------------------------------
      // 测试阶段 4: 锁定区域保护测试 (Lock Protection Check)
      // ----------------------------------------------------
      log('--- [4/8] 锁定区域保护拦截测试 ---', 'info');
      // 给帧 0 添加锁定区域 (x: 12, y: 8, w: 8, h: 5) 保护脸部
      const lockRegRes = api.lockRegion(sheetIndex, 0, 0, 12, 8, 8, 5);
      assert(lockRegRes.success, '成功锁定脸部区域', '12,8 8x5');

      // 尝试向脸部区域写入像素
      const drawToLockRes = api.setPixels(testLayerIdx, sheetIndex, 0, 0, [
        { x: 14, y: 9, r: 0, g: 255, b: 0, a: 255 }, // 脸部眼睛处（被锁定）
        { x: 2, y: 2, r: 0, g: 255, b: 0, a: 255 }   // 外部空白处（未锁定）
      ]);

      assert(drawToLockRes.modifiedPixels === 1, '仅非锁定像素写入成功', `修改数: ${drawToLockRes.modifiedPixels}`);
      assert(drawToLockRes.rejectedPixels.length === 1 && drawToLockRes.rejectedPixels[0].reason === '像素位于锁定区域内',
        '锁定区域像素被拦截并返回正确原因', drawToLockRes.rejectedPixels[0]?.reason);

      // 测试整帧锁定保护
      api.lockFrame(sheetIndex, 0, 0);
      const drawToLockedFrameRes = api.setPixels(testLayerIdx, sheetIndex, 0, 0, [
        { x: 2, y: 3, r: 255, g: 255, b: 0, a: 255 }
      ]);
      assert(drawToLockedFrameRes.modifiedPixels === 0 && drawToLockedFrameRes.rejectedPixels[0].reason === '目标帧已被锁定',
        '整帧锁定状态下任何写入均被拒绝', drawToLockedFrameRes.rejectedPixels[0]?.reason);

      // 解锁整帧并移除锁定区域，方便后续测试
      api.unlockFrame(sheetIndex, 0, 0);
      api.unlockRegion(sheetIndex, 0, 0, 12, 8, 8, 5);

      // ----------------------------------------------------
      // 测试阶段 5: 批量像素绘制与图层可见性 (Batch Drawing)
      // ----------------------------------------------------
      log('--- [5/8] 批量像素绘制与图层合成测试 ---', 'info');
      // 在编辑图层绘制一条绿色腰带
      const beltPixels = [];
      for (let bx = 12; bx < 20; bx++) {
        beltPixels.push({ x: bx, y: 20, r: 0, g: 255, b: 100, a: 255 });
      }
      const drawBeltRes = api.setPixels(testLayerIdx, sheetIndex, 0, 0, beltPixels);
      assert(drawBeltRes.modifiedPixels === 8, '成功批量绘制8个腰带像素', `修改数: ${drawBeltRes.modifiedPixels}`);

      // 检查合成后像素是否呈现新颜色
      const checkCompPixel = api.getPixel(sheetIndex, 0, 0, 15, 20);
      assert(checkCompPixel.data.g === 255 && checkCompPixel.data.r === 0, '多图层合成呈现新绘制像素', `G=${checkCompPixel.data.g}`);

      // 隐藏该图层，验证合成自动恢复下层像素
      api.setLayerVisibility(testLayerIdx, false);
      const hiddenCompPixel = api.getPixel(sheetIndex, 0, 0, 15, 20);
      assert(hiddenCompPixel.data.g !== 255, '隐藏图层后自动恢复原底图像素', `G=${hiddenCompPixel.data.g}`);
      api.setLayerVisibility(testLayerIdx, true); // 恢复可见

      // ----------------------------------------------------
      // 测试阶段 6: 历史记录撤销与重做 (Undo / Redo)
      // ----------------------------------------------------
      log('--- [6/8] 历史记录撤销重做测试 ---', 'info');
      // 当前 (15, 20) 是绿色 (G=255)
      const undoRes = api.undo();
      assert(undoRes.success, '执行撤销成功', undoRes.data?.description);

      const afterUndoPixel = api.getPixel(sheetIndex, 0, 0, 15, 20);
      assert(afterUndoPixel.data.g !== 255, '撤销后像素值精确回退', `当前G: ${afterUndoPixel.data.g}`);

      const redoRes = api.redo();
      assert(redoRes.success, '执行重做成功', redoRes.data?.description);
      const afterRedoPixel = api.getPixel(sheetIndex, 0, 0, 15, 20);
      assert(afterRedoPixel.data.g === 255, '重做后像素值重新生效', `当前G: ${afterRedoPixel.data.g}`);

      // ----------------------------------------------------
      // 测试阶段 7: 质量检查 Inspection 测试 (Validation)
      // ----------------------------------------------------
      log('--- [7/8] 自动化质量检查测试 ---', 'info');
      // 正常帧校验
      const valNormal = api.validateFrame(sheetIndex, 0, 0);
      assert(valNormal.success && valNormal.data.valid === true, '未受污染帧校验判定合格', `检查项数: ${valNormal.data.checks.length}`);

      // 故意写入一个半透明像素 (a: 120)
      api.setPixels(testLayerIdx, sheetIndex, 0, 0, [{ x: 1, y: 1, r: 255, g: 255, b: 255, a: 120 }]);
      const valSemi = api.validateFrame(sheetIndex, 0, 0);
      const semiCheck = valSemi.data.checks.find(c => c.name.includes('半透明'));
      assert(valSemi.data.valid === false && semiCheck && semiCheck.passed === false, '精准检测出半透明像素违规', semiCheck?.detail);

      // 清理半透明像素
      api.undo();

      // ----------------------------------------------------
      // 测试阶段 8: PNG 导出与回读一致性测试 (Export Roundtrip)
      // ----------------------------------------------------
      log('--- [8/8] PNG 导出与回读一致性测试 ---', 'info');
      const dataUrlRes = api.getFrameDataURL(sheetIndex, 0, 0);
      assert(dataUrlRes.success && dataUrlRes.data.dataURL.startsWith('data:image/png'), '生成导出 PNG DataURL', `${dataUrlRes.data.dataURL.slice(0, 30)}...`);

      // 将导出的 DataURL 加载为 Image
      const roundtripImg = new Image();
      await new Promise((resolve, reject) => {
        roundtripImg.onload = resolve;
        roundtripImg.onerror = reject;
        roundtripImg.src = dataUrlRes.data.dataURL;
      });

      assert(roundtripImg.width === 32 && roundtripImg.height === 32, '回读图像尺寸一致', '32x32');

      // 从回读图像获取 ImageData
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 32;
      offCanvas.height = 32;
      const offCtx = offCanvas.getContext('2d');
      offCtx.imageSmoothingEnabled = false;
      offCtx.drawImage(roundtripImg, 0, 0);
      const reimportedData = offCtx.getImageData(0, 0, 32, 32);

      // 与内存当前复合 ImageData 逐像素对比
      const liveData = app.canvasManager.getCompositeImageData(sheetIndex, 0, 0);
      let mismatchCount = 0;
      for (let i = 0; i < liveData.data.length; i++) {
        if (liveData.data[i] !== reimportedData.data[i]) {
          mismatchCount++;
        }
      }

      assert(mismatchCount === 0, 'PNG 导出再回读数据逐字节完全一致 (0 像素差异)', `差异字节: ${mismatchCount}`);

      // 汇总测试结果
      const totalTests = results.length;
      const passedTests = results.filter(r => r.pass).length;
      const failedTests = totalTests - passedTests;

      log('====================================================', 'info');
      log(`🎯 测试执行完毕! 总计: ${totalTests}, 通过: ${passedTests}, 失败: ${failedTests}`, failedTests === 0 ? 'pass' : 'fail');
      log('====================================================', 'info');

      return {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        results
      };

    } catch (globalErr) {
      log(`测试套件发生异常: ${globalErr.message}\n${globalErr.stack}`, 'fail');
      return {
        total: results.length + 1,
        passed: results.filter(r => r.pass).length,
        failed: results.filter(r => !r.pass).length + 1,
        error: globalErr.message,
        results
      };
    }
  };
})();

