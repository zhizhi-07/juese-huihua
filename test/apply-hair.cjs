const fs = require('fs');
const path = require('path');
const { createCanvas, ImageData } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

const anim = require('./hair-animation.cjs');

// 将 ImageData 转为 { width, height, dataURL }
function imgDataToEntry(imgData) {
  const c = createCanvas(imgData.width, imgData.height);
  c.getContext('2d').putImageData(imgData, 0, 0);
  return {
    width: imgData.width,
    height: imgData.height,
    dataURL: c.toDataURL('image/png')
  };
}

async function applyHairToMain() {
  console.log('1. Fetching latest main project...');
  const res = await fetch('http://127.0.0.1:8765/api/project?id=main');
  const etag = res.headers.get('etag');
  const project = await res.json();
  console.log('Current ETag:', etag);

  const si = 8; // original32_idle
  const ai = 1; // down (待机正面)

  // 1. 生成 4 帧数据
  const frontFrames   = anim.generateFrontHairFrames();
  const rearLongFrames= anim.generateRearLongHairFrames();
  const rearTwinFrames= anim.generateRearTwinFrames();
  const headbandFrames= anim.generateHeadbandFrames();
  const ribbonsFrames = anim.generateRibbonsFrames();

  function buildFrameDataMap(frames) {
    const map = {};
    for (let fi = 0; fi < frames.length; fi++) {
      const key = `${si}_${ai}_${fi}`;
      map[key] = imgDataToEntry(frames[fi]);
    }
    return map;
  }

  // 2. 创建图层对象
  const lRearLong = {
    sheetIndex: si,
    isGroup: false,
    parent: null,
    depth: 0,
    referenceOnly: false,
    name: '头发 / 03 浅绿披发 / 后发',
    visible: true,
    locked: false,
    opacity: 1,
    frameData: buildFrameDataMap(rearLongFrames)
  };

  const lRearTwin = {
    sheetIndex: si,
    isGroup: false,
    parent: null,
    depth: 0,
    referenceOnly: false,
    name: '头发 / 03 浅绿双马尾 / 后发',
    visible: false,
    locked: false,
    opacity: 1,
    frameData: buildFrameDataMap(rearTwinFrames)
  };

  const lFront = {
    sheetIndex: si,
    isGroup: false,
    parent: null,
    depth: 0,
    referenceOnly: false,
    name: '头发 / 03 碎齐刘海 / 前发',
    visible: true,
    locked: false,
    opacity: 1,
    frameData: buildFrameDataMap(frontFrames)
  };

  const lHeadband = {
    sheetIndex: si,
    isGroup: false,
    parent: null,
    depth: 0,
    referenceOnly: false,
    name: '发饰 / 03 紫色发箍',
    visible: false,
    locked: false,
    opacity: 1,
    frameData: buildFrameDataMap(headbandFrames)
  };

  const lRibbons = {
    sheetIndex: si,
    isGroup: false,
    parent: null,
    depth: 0,
    referenceOnly: false,
    name: '发饰 / 03 双马尾粉色缎带',
    visible: false,
    locked: false,
    opacity: 1,
    frameData: buildFrameDataMap(ribbonsFrames)
  };

  // 3. 隐藏现有的 02 发型
  project.layers.forEach(l => {
    if (l.sheetIndex === si) {
      if (l.name === '头发 / 02 齐刘海 / 前发') l.visible = false;
      if (l.name === '头发 / 02 双马尾 / 后发') l.visible = false;
    }
  });

  // 4. 定位插入位置：
  // 后发图层插入在现有后发之后（index=7）
  const rearInsertIdx = 7;
  // 插入 2 个后发图层
  project.layers.splice(rearInsertIdx, 0, lRearLong, lRearTwin);
  // 更新后面所有图层的 parent 指针
  for (let i = rearInsertIdx + 2; i < project.layers.length; i++) {
    const l = project.layers[i];
    if (l.parent != null && l.parent >= rearInsertIdx) {
      l.parent += 2;
    }
  }

  // 前发和发饰图层添加到末尾
  project.layers.push(lFront, lHeadband, lRibbons);

  console.log(`Updated layers count: ${project.layers.length}`);

  // 5. 提交保存
  console.log('Sending PUT request to save project...');
  const putRes = await fetch('http://127.0.0.1:8765/api/project?id=main', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Pixel-Editor': '1',
      'If-Match': etag
    },
    body: JSON.stringify(project)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`PUT failed: ${putRes.status} ${putRes.statusText} - ${errText}`);
  }

  const putResult = await putRes.json();
  console.log('PUT success:', putResult);

  // 6. 回读校验
  console.log('Verifying via GET...');
  const verifyRes = await fetch('http://127.0.0.1:8765/api/project?id=main');
  const verifyData = await verifyRes.json();
  const verifyEtag = verifyRes.headers.get('etag');

  const hasFront = verifyData.layers.some(l => l.name === '头发 / 03 碎齐刘海 / 前发' && l.visible);
  const hasRear = verifyData.layers.some(l => l.name === '头发 / 03 浅绿披发 / 后发' && l.visible);
  console.log('Verification check: hasFront=', hasFront, 'hasRear=', hasRear, 'newETag=', verifyEtag);
  if (!hasFront || !hasRear) {
    throw new Error('Verification failed: newly added hair layers not found in response!');
  }

  console.log('ALL PASS: Project successfully updated and verified.');
}

applyHairToMain().catch(e => {
  console.error('Error applying hair:', e);
  process.exit(1);
});
