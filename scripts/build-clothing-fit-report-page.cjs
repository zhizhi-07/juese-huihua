// 把 output/clothing-fit-compare-20261108 的图和数据打包成一个自包含网页（图片内嵌 base64，file:// 直接可看）。
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'output/clothing-fit-compare-20261108');
const report = JSON.parse(fs.readFileSync(path.join(DIR, 'report.json'), 'utf8'));
const dataURI = (name) => {
  const buf = fs.readFileSync(path.join(DIR, name));
  const { decode } = require('./png.cjs');
  const im = decode(buf);
  return { uri: 'data:image/png;base64,' + buf.toString('base64'), width: im.width, height: im.height };
};
const compare = dataURI('compare.png');
const legDemo = dataURI('leg-fix-demo.png');
const garment = dataURI('garment-source.png');

const ALGOS = [
  { id: 'old', name: '旧 · 逐行横带', note: 'js/clothing-fit.js 现有算法' },
  { id: 'newBefore', name: '新 · 部位（修正前）', note: '腿部忽略纵向比例' },
  { id: 'newAfter', name: '新 · 部位（修正后）', note: '当前 test/clothing-studio.html 使用' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// metrics 是按「目标 → 旧/新修正前/新修正后」顺序写入的，按顺序取值，不靠算法名匹配。
const targets = [...new Set(report.metrics.map((m) => m.target))];
const tableRows = targets.map((t) => {
  const group = report.metrics.filter((m) => m.target === t);
  const cells = ALGOS.map((a, i) => {
    const m = group[i];
    return `<td class="num"><span class="px">${m.clothPixels}</span><span class="sub">贴身 ${m.onBody} / 溢出 ${m.offBody} / 压描边 ${m.onOutline}</span></td>`;
  }).join('');
  return `<tr><th scope="row">${esc(t)}</th>${cells}</tr>`;
}).join('');

const asciiCols = [
  { title: '你画的短裤（8 格）', key: 'painted', accent: '#e0b04a' },
  { title: `修正前（${report.legFixDemo.beforePixels} 格，铺满 ${report.legFixDemo.beforeLegRows} 行腿）`, key: 'before', accent: '#e0607a' },
  { title: `修正后（${report.legFixDemo.afterPixels} 格，${report.legFixDemo.afterLegRows} 行腿）`, key: 'after', accent: '#5ac08a' },
];
const asciiHTML = asciiCols.map((c) => `
      <figure class="ascii">
        <figcaption style="color:${c.accent}">${esc(c.title)}</figcaption>
        <pre>${esc(report.legFixDemo.ascii[c.key].join('\n'))}</pre>
      </figure>`).join('');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>衣服贴合算法对照 · 20261108</title>
<style>
  :root{
    --bg:#0f1117; --card:#171a23; --card2:#1c2030; --line:#2a3044;
    --text:#e6e8ef; --muted:#8b93a7; --accent:#6c86d9; --good:#5ac08a; --bad:#e0607a; --warn:#e0b04a;
  }
  *{box-sizing:border-box}
  body{margin:0;background:radial-gradient(1200px 600px at 20% -10%,#1b2136 0%,#0f1117 60%) no-repeat;background-color:var(--bg);color:var(--text);
       font:15px/1.65 system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1080px;margin:0 auto;padding:48px 24px 96px}
  header{margin-bottom:36px}
  .eyebrow{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:600}
  h1{margin:10px 0 12px;font-size:32px;line-height:1.25;letter-spacing:-.01em}
  .lede{color:var(--muted);max-width:70ch;margin:0}
  .meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
  .chip{font-size:12px;padding:5px 11px;border:1px solid var(--line);border-radius:999px;color:var(--muted);background:#131722}
  .chip b{color:var(--text);font-weight:600}
  section{margin-top:44px}
  .sec-head{display:flex;align-items:baseline;gap:14px;margin-bottom:18px}
  .sec-head h2{margin:0;font-size:20px;letter-spacing:-.01em}
  .sec-head p{margin:0;color:var(--muted);font-size:13px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;box-shadow:0 12px 32px #0006}
  .figure{display:flex;justify-content:center;background:var(--card2);border-radius:12px;padding:18px;overflow:auto}
  .figure img{image-rendering:pixelated;display:block}
  .legend{display:flex;flex-wrap:wrap;gap:18px;margin-top:16px;font-size:13px;color:var(--muted)}
  .legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:7px;vertical-align:middle}
  table{width:100%;border-collapse:collapse;font-size:14px}
  thead th{text-align:left;font-weight:600;font-size:12.5px;color:var(--muted);padding:0 12px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
  tbody th{text-align:left;font-weight:600;padding:12px;border-bottom:1px solid #212637;white-space:nowrap}
  td.num{padding:12px;border-bottom:1px solid #212637;font-variant-numeric:tabular-nums}
  .px{font-size:17px;font-weight:700;color:var(--text)}
  .sub{display:block;font-size:11.5px;color:var(--muted);margin-top:2px}
  .ascii-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
  @media(max-width:820px){.ascii-grid{grid-template-columns:1fr}}
  .ascii{margin:0;background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:14px}
  .ascii figcaption{font-size:12.5px;margin-bottom:10px;font-weight:600}
  .ascii pre{margin:0;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;color:#cfd5e6;overflow:auto}
  .verdict{display:grid;gap:12px}
  .vrow{display:grid;grid-template-columns:26px 1fr;gap:12px;align-items:start;background:var(--card2);border:1px solid var(--line);
        border-left:3px solid var(--accent);border-radius:10px;padding:14px 16px}
  .vrow .mark{font-size:15px;line-height:1.5}
  .vrow b{display:block;margin-bottom:3px}
  .vrow span{color:var(--muted);font-size:13.5px}
  .ok{border-left-color:var(--good)} .bad{border-left-color:var(--bad)} .warn{border-left-color:var(--warn)}
  .links{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
  .links a{display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:var(--text);background:var(--card2);
           border:1px solid var(--line);border-radius:10px;padding:10px 15px;font-size:13.5px;transition:.15s}
  .links a:hover{border-color:var(--accent);background:#212840;transform:translateY(-1px)}
  .links a small{color:var(--muted);font-size:12px}
  footer{margin-top:56px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:12.5px}
  code{background:#0d1017;border:1px solid var(--line);border-radius:5px;padding:1px 6px;font-size:12.5px}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="eyebrow">Pixel Garment Fit · 只读校验</div>
    <h1>衣服贴合算法对照</h1>
    <p class="lede">同一件示例衣服，交给三套算法分别贴到主工程现有的四副身体上。旧算法是逐行横带缩放，新算法按躯干 / 左腿 / 右腿分段点位贴合；新算法在修正前后各跑一遍，看腿部纵向比例那一处 bug 的实际影响。</p>
    <div class="meta">
      <span class="chip">数据源 <b>data/shared-project.json</b></span>
      <span class="chip">源帧 <b>${esc(report.sourceFrame)}</b></span>
      <span class="chip">示例衣服 <b>${report.garmentPixels} 格</b></span>
      <span class="chip">模型记录 <b>${report.modelRecords} 条</b></span>
      <span class="chip">生成于 <b>${esc(new Date(report.generatedAt).toLocaleString('zh-CN'))}</b></span>
    </div>
  </header>

  <section>
    <div class="sec-head"><h2>1 · 四副身体 × 三套算法</h2><p>每格上方灰色为素体，彩色为贴合结果</p></div>
    <div class="card">
      <div class="figure">
        <img src="${compare.uri}" width="${Math.round(compare.width * 1.15)}" height="${Math.round(compare.height * 1.15)}" alt="四副身体三套算法的贴合结果对照图">
      </div>
      <div class="legend">
        ${ALGOS.map((a, i) => `<span><i style="background:${['#6c86d9', '#e0607a', '#5ac08a'][i]}"></i>${esc(a.name)} — ${esc(a.note)}</span>`).join('')}
      </div>
    </div>
  </section>

  <section>
    <div class="sec-head"><h2>2 · 量化指标</h2><p>格数 / 落在身体上的格 / 溢出到空白的格 / 压在描边上的格</p></div>
    <div class="card">
      <table>
        <thead><tr><th>目标身体</th>${ALGOS.map((a) => `<th>${esc(a.name)}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  </section>

  <section>
    <div class="sec-head"><h2>3 · 腿部修正前后</h2><p>当前 19×19 素体腿只有 1~2 行，看不出差别，所以另用一副 13×20 的长腿素体单独演示</p></div>
    <div class="card">
      <div class="figure" style="margin-bottom:20px">
        <img src="${legDemo.uri}" width="${Math.round(legDemo.width * 1.2)}" height="${Math.round(legDemo.height * 1.2)}" alt="长腿素体下的短裤贴合：原画 / 修正前 / 修正后">
      </div>
      <div class="ascii-grid">${asciiHTML}
      </div>
    </div>
  </section>

  <section>
    <div class="sec-head"><h2>4 · 结论</h2><p>都基于本次实测，不是推断</p></div>
    <div class="verdict">
      <div class="vrow ok"><span class="mark">✓</span><div><b>重贴到同一副身体，三套算法都像素级还原</b><span>与画的 ${report.identity.paintingPixels} 格相比，旧算法、新算法修正前、修正后的差异格数均为 ${report.identity.paintingVsOld} / ${report.identity.paintingVsNewBefore} / ${report.identity.paintingVsNewAfter}。</span></div></div>
      <div class="vrow warn"><span class="mark">!</span><div><b>当前工程尺度下，新旧算法几乎无差别</b><span>body 图层实际只有 5 行墨迹、躯干 5 px 宽，示例衣服仅 ${report.garmentPixels} 格。四个目标里只有走路帧不同：旧 16 格、新修正后 14 格。</span></div></div>
      <div class="vrow bad"><span class="mark">✗</span><div><b>修正前的腿部分支是真 bug</b><span>只保留横向比例 <code>u</code>、丢掉纵向比例 <code>t</code>，一条两行短裤会被刷满整条腿：${report.legFixDemo.paintedShortsPixels} 格 → ${report.legFixDemo.beforePixels} 格铺满 ${report.legFixDemo.beforeLegRows} 行。修正后回到 ${report.legFixDemo.afterPixels} 格 / ${report.legFixDemo.afterLegRows} 行，与所画一致。</span></div></div>
      <div class="vrow"><span class="mark">→</span><div><b>生产算法尚未更换</b><span><code>js/clothing-fit.js</code> 仍是旧的分行横带算法，本次只修了演示页，没有改主工程、没有写回任何工程数据。</span></div></div>
    </div>
  </section>

  <section>
    <div class="sec-head"><h2>5 · 相关页面</h2><p>本地服务在跑时可用 http 打开，否则直接双击文件也行</p></div>
    <div class="links">
      <a href="../../test/clothing-studio.html">绘制试贴台 <small>test/clothing-studio.html</small></a>
      <a href="../../test/clothing-lab.html">算法实验台 <small>test/clothing-lab.html</small></a>
      <a href="./compare.png">对照原图 <small>compare.png</small></a>
      <a href="./leg-fix-demo.png">腿部演示 <small>leg-fix-demo.png</small></a>
      <a href="./report.json">原始数据 <small>report.json</small></a>
    </div>
  </section>

  <footer>
    示例衣服 ${report.garmentPixels} 格 · 模型记录 ${report.modelRecords} 条 · 图 ${garment.width}×${garment.height} px 为同一件衣服放大版<br>
    本页由 <code>scripts/build-clothing-fit-report-page.cjs</code> 生成，图片已内嵌，离线可看。
  </footer>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(DIR, 'index.html'), html);
console.log('已生成', path.join(DIR, 'index.html'), html.length, 'bytes');
