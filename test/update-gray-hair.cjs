const fs = require('fs');
const path = require('path');
const { createCanvas, ImageData } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

const v5 = require('./hair-final-v5.cjs');

// 统一将 ImageData 序列化为项目格式
function toEntry(imgData) {
  const c = createCanvas(imgData.width, imgData.height);
  c.getContext('2d').putImageData(imgData, 0, 0);
  return {
    width: imgData.width,
    height: imgData.height,
    dataURL: c.toDataURL('image/png')
  };
}

async function updateToGrayDualNotch() {
  console.log('1. Fetching latest main project...');
  const res = await fetch('http://127.0.0.1:8765/api/project?id=main');
  const etag = res.headers.get('etag');
  const project = await res.json();
  console.log('Current ETag:', etag);

  const si = 8; // original32_idle

  // 生成 3 个方向的 4 帧数据 (帧0,1正常; 帧2,3随呼吸下沉2像素)
  const dirGens = [
    { ai: 0, gen: v5.generateFrontSide }, // side
    { ai: 1, gen: v5.generateFrontDown }, // down
    { ai: 2, gen: v5.generateFrontUp }    // up
  ];

  const frontFrameData = {};
  dirGens.forEach(d => {
    const f0 = d.gen();
    const f1 = d.gen();
    const f2 = v5.shiftY(f0, 2);
    const f3 = v5.shiftY(f0, 2);
    frontFrameData[`${si}_${d.ai}_0`] = toEntry(f0);
    frontFrameData[`${si}_${d.ai}_1`] = toEntry(f1);
    frontFrameData[`${si}_${d.ai}_2`] = toEntry(f2);
    frontFrameData[`${si}_${d.ai}_3`] = toEntry(f3);
  });

  // 找或创建前发图层
  let frontLayer = project.layers.find(l => l.sheetIndex === si && (l.name.includes('03 碎齐刘海') || l.name.includes('03 双缺口齐刘海')));
  if (!frontLayer) {
    frontLayer = {
      sheetIndex: si,
      isGroup: false,
      parent: null,
      depth: 0,
      referenceOnly: false,
      name: '头发 / 03 双缺口齐刘海 / 前发',
      visible: true,
      locked: false,
      opacity: 1,
      frameData: {}
    };
    project.layers.push(frontLayer);
  } else {
    frontLayer.name = '头发 / 03 双缺口齐刘海 / 前发';
    frontLayer.visible = true;
  }
  frontLayer.frameData = frontFrameData;

  // 将后发长披发也转换为灰色，让整套发型浑然一体
  // 灰色的长披发 (v3 的披发轮廓，替换为灰色阶)
  const C_OUTLINE = [119, 119, 119, 255];
  const C_SHADOW  = [178, 178, 178, 255];
  const C_BASE    = [209, 209, 209, 255];

  const v3 = require('./hair-generator-v3.cjs');
  const greenRear = v3.makeRearLongHairV3();
  const grayRear = new ImageData(32, 32);
  for (let i = 0; i < greenRear.data.length; i += 4) {
    if (greenRear.data[i + 3] > 0) {
      const g = greenRear.data[i + 1];
      let color = C_BASE;
      if (g < 60) color = C_OUTLINE;
      else if (g < 180) color = C_SHADOW;
      grayRear.data[i] = color[0];
      grayRear.data[i+1] = color[1];
      grayRear.data[i+2] = color[2];
      grayRear.data[i+3] = 255;
    }
  }

  const grayRearF2 = v5.shiftY(grayRear, 2);
  const rearFrameData = {
    [`${si}_1_0`]: toEntry(grayRear),
    [`${si}_1_1`]: toEntry(grayRear),
    [`${si}_1_2`]: toEntry(grayRearF2),
    [`${si}_1_3`]: toEntry(grayRearF2)
  };

  let rearLayer = project.layers.find(l => l.sheetIndex === si && l.name.includes('03 浅绿披发 / 后发'));
  if (rearLayer) {
    rearLayer.name = '头发 / 03 灰色长披发 / 后发';
    rearLayer.visible = true;
    rearLayer.frameData = rearFrameData;
  }

  // 确保旧发型 02 保持隐藏
  project.layers.forEach(l => {
    if (l.sheetIndex === si) {
      if (l.name === '头发 / 02 齐刘海 / 前发') l.visible = false;
    }
  });

  // 提交保存
  console.log('Sending PUT to /api/project?id=main ...');
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

  // 回读验证
  console.log('Verifying via GET...');
  const vRes = await fetch('http://127.0.0.1:8765/api/project?id=main');
  const vProject = await vRes.json();
  const vLayer = vProject.layers.find(l => l.name === '头发 / 03 双缺口齐刘海 / 前发' && l.sheetIndex === si);
  if (!vLayer) throw new Error('Verification failed: layer not found');

  // 检查 3 个方向的 frameData 是否完备
  for (let ai of [0, 1, 2]) {
    for (let fi = 0; fi < 4; fi++) {
      const k = `${si}_${ai}_${fi}`;
      if (!vLayer.frameData[k]) throw new Error(`Missing frame key: ${k}`);
    }
  }
  console.log('ALL PASS: All 12 frames across 3 directions verified in API response!');
}

updateToGrayDualNotch().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
